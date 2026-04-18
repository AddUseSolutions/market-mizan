import json
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Set
from urllib.parse import urljoin, urlparse

USE_POSTGRES = bool(os.getenv("DATABASE_URL", "").strip())

if USE_POSTGRES:
    import psycopg
    from psycopg.rows import dict_row
    from psycopg.types.json import Json
else:
    import mysql.connector

from config import DB_CONFIG


def get_connection():
    if USE_POSTGRES:
        return psycopg.connect(os.environ["DATABASE_URL"])
    return mysql.connector.connect(**DB_CONFIG)


def _dict_cursor(conn):
    if USE_POSTGRES:
        return conn.cursor(row_factory=dict_row)
    return conn.cursor(dictionary=True)


def ensure_properties_schema(conn):
    """
    Bestehende DBs: fehlende Spalten nachziehen.
    """
    if USE_POSTGRES:
        cur = conn.cursor()
        try:
            cur.execute(
                "ALTER TABLE properties ADD COLUMN IF NOT EXISTS source_listing_updated VARCHAR(512)"
            )
            cur.execute("ALTER TABLE properties ALTER COLUMN location_district TYPE VARCHAR(512)")
            cur.execute(
                "ALTER TABLE properties ADD COLUMN IF NOT EXISTS location_area VARCHAR(255)"
            )
            conn.commit()
        finally:
            cur.close()
        return

    cur = conn.cursor()
    try:
        cur.execute(
            """
            ALTER TABLE properties
            ADD COLUMN source_listing_updated VARCHAR(512) NULL AFTER description
            """
        )
        conn.commit()
    except mysql.connector.Error as err:
        conn.rollback()
        if err.errno != 1060:
            raise
    finally:
        cur.close()

    cur = conn.cursor()
    try:
        cur.execute(
            "ALTER TABLE properties MODIFY COLUMN location_district VARCHAR(512) NULL"
        )
        conn.commit()
    finally:
        cur.close()

    cur = conn.cursor()
    try:
        cur.execute(
            "ALTER TABLE properties ADD COLUMN location_area VARCHAR(255) NULL AFTER location_city"
        )
        conn.commit()
    except mysql.connector.Error as err:
        conn.rollback()
        if err.errno != 1060:
            raise
    finally:
        cur.close()


def utc_now():
    return datetime.now(timezone.utc)


def normalize_detail_url(url: str) -> str:
    """
    Canonical detail URL for RealEthio — must match RealEthioScraper._normalize_property_href
    so sync sets and DB rows compare reliably.
    """
    u = (url or "").strip()
    if not u:
        return ""
    u = u.split("#")[0].strip()
    full = urljoin("https://realethio.com/", u)
    p = urlparse(full)
    host = (p.netloc or "").lower()
    if host not in ("realethio.com", "www.realethio.com"):
        return ""
    path = p.path or ""
    if not path.endswith("/"):
        path = path + "/"
    return f"https://realethio.com{path}"


def _scraped_at_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def list_urls_needing_detail_scrape(
    conn,
    source_website: str,
    discovered_urls: List[str],
    skip_if_scraped_within_hours: float,
) -> List[str]:
    """
    Returns canonical discovered URLs that need an LLM detail scrape: new URLs, re-listed (inactive),
    or last successful scraped_at older than the freshness window.
    """
    if not discovered_urls:
        return []

    cutoff = utc_now() - timedelta(hours=skip_if_scraped_within_hours)

    cur = _dict_cursor(conn)
    cur.execute(
        """
        SELECT detail_url, scraped_at, is_active
        FROM properties
        WHERE source_website = %s
        """,
        (source_website,),
    )
    rows = cur.fetchall()
    cur.close()

    merged: Dict[str, Dict] = {}
    for row in rows:
        n = normalize_detail_url(row["detail_url"])
        if not n:
            continue
        sa = row.get("scraped_at")
        ia = bool(row.get("is_active", True))
        if n not in merged:
            merged[n] = {"scraped_at": sa, "is_active": ia}
        else:
            prev = merged[n]
            prev["is_active"] = prev["is_active"] or ia
            if sa is not None and (prev["scraped_at"] is None or sa > prev["scraped_at"]):
                prev["scraped_at"] = sa

    seen_norm: Set[str] = set()
    out: List[str] = []
    for u in discovered_urls:
        n = normalize_detail_url(u)
        if not n or n in seen_norm:
            continue
        seen_norm.add(n)
        info = merged.get(n)
        if info is None:
            out.append(u)
            continue
        if not info["is_active"]:
            out.append(u)
            continue
        sa_utc = _scraped_at_utc(info.get("scraped_at"))
        if sa_utc is None or sa_utc < cutoff:
            out.append(u)

    return out


def deactivate_orphans_not_in_sync(conn, source_website: str, sync_normalized_urls: Set[str]) -> int:
    """
    Soft-delete (is_active=FALSE) rows for this source whose normalized detail_url is not in the
    current crawl sync set.
    """
    cur = _dict_cursor(conn)
    cur.execute(
        """
        SELECT id, detail_url
        FROM properties
        WHERE source_website = %s AND is_active = TRUE
        """,
        (source_website,),
    )
    rows = cur.fetchall()
    cur.close()

    to_deactivate: List[int] = []
    for r in rows:
        n = normalize_detail_url(r["detail_url"])
        if n and n not in sync_normalized_urls:
            to_deactivate.append(r["id"])

    if not to_deactivate:
        return 0

    cursor = conn.cursor()
    total = 0
    chunk_size = 400
    for i in range(0, len(to_deactivate), chunk_size):
        chunk = to_deactivate[i : i + chunk_size]
        placeholders = ", ".join(["%s"] * len(chunk))
        cursor.execute(
            f"UPDATE properties SET is_active = FALSE WHERE id IN ({placeholders})",
            tuple(chunk),
        )
        total += cursor.rowcount or 0
    conn.commit()
    cursor.close()
    return total


def upsert_property(conn, data):
    """
    - property_id NEU → INSERT, is_active=TRUE
    - property_id EXISTIERT → UPDATE alle Felder, last_seen=jetzt
    - Gibt zurück: 'new' oder 'updated'
    """
    cursor = _dict_cursor(conn)
    cursor.execute("SELECT id FROM properties WHERE property_id = %s", (data["property_id"],))
    exists = cursor.fetchone()
    cursor.close()

    payload = data.copy()
    if USE_POSTGRES:
        payload["features"] = Json(payload.get("features", []) or [])
        payload["images"] = Json(payload.get("images", []) or [])
    else:
        payload["features"] = json.dumps(payload.get("features", []), ensure_ascii=False)
        payload["images"] = json.dumps(payload.get("images", []), ensure_ascii=False)
    ld = payload.get("location_district")
    if isinstance(ld, str) and len(ld) > 512:
        payload["location_district"] = ld[:512].rstrip()

    fields = [
        "property_id", "source_website", "source_name", "detail_url", "title", "price",
        "currency", "property_size_m2", "land_area_m2", "bedrooms", "bathrooms", "garage",
        "property_type", "property_status", "floor", "furnished", "features", "images",
        "google_maps_url", "latitude", "longitude", "location_city", "location_area", "location_district",
        "description", "source_listing_updated", "is_scraped",
    ]

    if exists:
        set_clause = ", ".join([f"{field} = %s" for field in fields if field != "property_id"])
        values = [payload.get(field) for field in fields if field != "property_id"]
        values.extend([True, utc_now(), utc_now(), payload["property_id"]])
        cursor = conn.cursor()
        cursor.execute(
            f"""
            UPDATE properties
            SET {set_clause},
                is_active = %s,
                last_seen = %s,
                scraped_at = %s
            WHERE property_id = %s
            """,
            tuple(values),
        )
        conn.commit()
        cursor.close()
        return "updated"

    placeholders = ", ".join(["%s"] * len(fields))
    cursor = conn.cursor()
    cursor.execute(
        f"""
        INSERT INTO properties ({", ".join(fields)}, is_active, last_seen, scraped_at)
        VALUES ({placeholders}, %s, %s, %s)
        """,
        tuple([payload.get(field) for field in fields] + [True, utc_now(), utc_now()]),
    )
    conn.commit()
    cursor.close()
    return "new"


def deactivate_missing(conn, source_website, scraped_ids):
    """
    Setzt is_active=FALSE für alle Immobilien dieser Quelle,
    deren property_id NICHT in scraped_ids vorkommt.
    """
    cursor = conn.cursor()
    if not scraped_ids:
        cursor.execute(
            "UPDATE properties SET is_active = FALSE WHERE source_website = %s AND is_active = TRUE",
            (source_website,),
        )
    else:
        placeholders = ", ".join(["%s"] * len(scraped_ids))
        query = f"""
            UPDATE properties
            SET is_active = FALSE
            WHERE source_website = %s
              AND is_active = TRUE
              AND property_id NOT IN ({placeholders})
        """
        cursor.execute(query, tuple([source_website] + scraped_ids))
    affected = cursor.rowcount
    conn.commit()
    cursor.close()
    return affected


def log_scrape(conn, source, started, finished, found, new, updated, deactivated, status, error=None):
    """Schreibt Eintrag in scrape_logs Tabelle"""
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO scrape_logs (
            source_website, started_at, finished_at, properties_found,
            properties_new, properties_updated, properties_deactivated, status, error_message
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (source, started, finished, found, new, updated, deactivated, status, error),
    )
    conn.commit()
    cursor.close()
