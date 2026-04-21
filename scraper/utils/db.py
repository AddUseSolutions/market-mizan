import json
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Set
from urllib.parse import urlparse

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
            cur.execute(
                "ALTER TABLE properties ADD COLUMN IF NOT EXISTS detail_url_normalized VARCHAR(2048)"
            )
            cur.execute(
                "ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_scrape_error_at TIMESTAMPTZ"
            )
            cur.execute(
                "ALTER TABLE properties ADD COLUMN IF NOT EXISTS scrape_fail_count INT NOT NULL DEFAULT 0"
            )
            cur.execute(
                "ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_scrape_error_type VARCHAR(64)"
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_properties_src_detail_url_norm
                ON properties (source_website, detail_url_normalized)
                """
            )
            conn.commit()
        finally:
            cur.close()
        _backfill_detail_url_normalized(conn)
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

    cur = conn.cursor()
    try:
        cur.execute(
            "ALTER TABLE properties ADD COLUMN detail_url_normalized VARCHAR(2048) NULL"
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
            "ALTER TABLE properties ADD COLUMN last_scrape_error_at TIMESTAMP NULL"
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
            "ALTER TABLE properties ADD COLUMN scrape_fail_count INT NOT NULL DEFAULT 0"
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
            "ALTER TABLE properties ADD COLUMN last_scrape_error_type VARCHAR(64) NULL"
        )
        conn.commit()
    except mysql.connector.Error as err:
        conn.rollback()
        if err.errno != 1060:
            raise
    finally:
        cur.close()

    try:
        cur = conn.cursor()
        cur.execute(
            "CREATE INDEX idx_properties_src_detail_url_norm ON properties (source_website, detail_url_normalized(512))"
        )
        conn.commit()
    except mysql.connector.Error as err:
        conn.rollback()
        if err.errno not in (1061, 1062):
            raise
    finally:
        try:
            cur.close()
        except Exception:
            pass

    _backfill_detail_url_normalized(conn)


def utc_now():
    return datetime.now(timezone.utc)


def _sanitize_numeric_for_db(value, max_abs: float = 9999999999999.99):
    """
    Keep numerics within DECIMAL(15,2)-safe absolute range.
    Out-of-range or invalid values are stored as NULL.
    """
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    if abs(v) > max_abs:
        return None
    return Decimal(f"{v:.2f}")


def normalize_detail_url(url: str) -> str:
    """
    Canonical detail URL for supported listing hosts (realethio.com, ethiopiarealty.com).
    Trailing slash is always present so DB sync and scraper inventory match regardless
    of how the source URL was written.
    """
    u = (url or "").strip()
    if not u:
        return ""
    u = u.split("#")[0].strip()
    if not u.startswith(("http://", "https://")):
        u = "https://" + u.lstrip("/")
    p = urlparse(u)
    host = (p.netloc or "").lower()
    if host.startswith("www."):
        host = host[4:]
    if host == "realethio.com":
        canonical = "realethio.com"
    elif host == "ethiopiarealty.com":
        canonical = "ethiopiarealty.com"
    else:
        return ""
    path = p.path or ""
    if not path.endswith("/"):
        path = path + "/"
    return f"https://{canonical}{path}"


def _backfill_detail_url_normalized(conn):
    """Einmalig detail_url_normalized für bestehende Zeilen (Duplikat-Erkennung)."""
    cur = _dict_cursor(conn)
    cur.execute(
        """
        SELECT id, detail_url FROM properties
        WHERE detail_url IS NOT NULL AND TRIM(detail_url) <> ''
          AND (detail_url_normalized IS NULL OR detail_url_normalized = '')
        LIMIT 20000
        """
    )
    rows = cur.fetchall()
    cur.close()
    if not rows:
        return
    ucur = conn.cursor()
    for r in rows:
        nu = normalize_detail_url(r["detail_url"])
        if not nu:
            continue
        ucur.execute(
            "UPDATE properties SET detail_url_normalized = %s WHERE id = %s",
            (nu, r["id"]),
        )
    conn.commit()
    ucur.close()


def _scraped_at_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def list_urls_needing_detail_scrape_with_reasons(
    conn,
    source_website: str,
    discovered_urls: List[str],
    skip_if_scraped_within_hours: float,
    not_found_cooldown_hours: float = 168.0,
) -> tuple[List[str], Dict[str, str]]:
    """
    Returns canonical discovered URLs that need an LLM detail scrape: new URLs, re-listed (inactive),
    or last successful scraped_at older than the freshness window.
    """
    if not discovered_urls:
        return [], {}

    cutoff = utc_now() - timedelta(hours=skip_if_scraped_within_hours)
    not_found_cutoff = utc_now() - timedelta(hours=not_found_cooldown_hours)

    cur = _dict_cursor(conn)
    cur.execute(
        """
        SELECT detail_url, detail_url_normalized, scraped_at, is_active, last_scrape_error_at, last_scrape_error_type
        FROM properties
        WHERE source_website = %s
        """,
        (source_website,),
    )
    rows = cur.fetchall()
    cur.close()

    merged: Dict[str, Dict] = {}
    for row in rows:
        n = (row.get("detail_url_normalized") or "").strip()
        if not n:
            n = normalize_detail_url(row.get("detail_url") or "")
        if not n:
            continue
        sa = row.get("scraped_at")
        ia = bool(row.get("is_active", True))
        if n not in merged:
            merged[n] = {
                "scraped_at": sa,
                "is_active": ia,
                "last_scrape_error_at": row.get("last_scrape_error_at"),
                "last_scrape_error_type": (row.get("last_scrape_error_type") or "").strip().lower(),
            }
        else:
            prev = merged[n]
            prev["is_active"] = prev["is_active"] or ia
            if sa is not None and (prev["scraped_at"] is None or sa > prev["scraped_at"]):
                prev["scraped_at"] = sa
            err_at = row.get("last_scrape_error_at")
            if err_at is not None and (
                prev["last_scrape_error_at"] is None or err_at > prev["last_scrape_error_at"]
            ):
                prev["last_scrape_error_at"] = err_at
                prev["last_scrape_error_type"] = (row.get("last_scrape_error_type") or "").strip().lower()

    seen_norm: Set[str] = set()
    out: List[str] = []
    reasons: Dict[str, str] = {}
    for u in discovered_urls:
        n = normalize_detail_url(u)
        if not n or n in seen_norm:
            continue
        seen_norm.add(n)
        info = merged.get(n)
        if info is None:
            out.append(u)
            reasons[u] = "new_url_not_in_db"
            continue
        err_at = _scraped_at_utc(info.get("last_scrape_error_at"))
        err_type = (info.get("last_scrape_error_type") or "").strip().lower()
        if err_type == "not_found" and err_at is not None and err_at >= not_found_cutoff:
            continue
        if not info["is_active"]:
            out.append(u)
            reasons[u] = "reactivated_from_inactive"
            continue
        sa_utc = _scraped_at_utc(info.get("scraped_at"))
        if sa_utc is None or sa_utc < cutoff:
            out.append(u)
            reasons[u] = "stale_or_missing_scraped_at"

    return out, reasons


def list_urls_needing_detail_scrape(
    conn,
    source_website: str,
    discovered_urls: List[str],
    skip_if_scraped_within_hours: float,
    not_found_cooldown_hours: float = 168.0,
) -> List[str]:
    urls, _reasons = list_urls_needing_detail_scrape_with_reasons(
        conn,
        source_website,
        discovered_urls,
        skip_if_scraped_within_hours,
        not_found_cooldown_hours,
    )
    return urls


def mark_scrape_failure_by_url(
    conn,
    source_website: str,
    detail_url: str,
    error_type: str,
    deactivate_after_failures: int = 2,
) -> int:
    """
    Merkt Fehler pro URL und deaktiviert nach N not_found-Fehlern.
    """
    norm = normalize_detail_url(detail_url)
    if not norm:
        return 0
    err = (error_type or "unknown").strip().lower()

    cur = conn.cursor()
    cur.execute(
        """
        UPDATE properties
        SET
            scrape_fail_count = COALESCE(scrape_fail_count, 0) + 1,
            last_scrape_error_at = %s,
            last_scrape_error_type = %s,
            is_active = CASE
                WHEN %s = 'not_found' AND COALESCE(scrape_fail_count, 0) + 1 >= %s THEN FALSE
                ELSE is_active
            END
        WHERE source_website = %s
          AND detail_url_normalized = %s
        """,
        (utc_now(), err, err, max(1, int(deactivate_after_failures)), source_website, norm),
    )
    affected = cur.rowcount or 0
    conn.commit()
    cur.close()
    return affected


def deactivate_orphans_not_in_sync(conn, source_website: str, sync_normalized_urls: Set[str]) -> int:
    """
    Soft-delete (is_active=FALSE) rows for this source whose normalized detail_url is not in the
    current crawl sync set.
    """
    cur = _dict_cursor(conn)
    cur.execute(
        """
        SELECT id, detail_url, detail_url_normalized
        FROM properties
        WHERE source_website = %s AND is_active = TRUE
        """,
        (source_website,),
    )
    rows = cur.fetchall()
    cur.close()

    to_deactivate: List[int] = []
    for r in rows:
        n = (r.get("detail_url_normalized") or "").strip() or normalize_detail_url(r.get("detail_url") or "")
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
    - Gleiche property_id → UPDATE
    - Gleiche normalisierte detail_url (andere property_id) → UPDATE dieselbe Zeile (Duplikat-Vermeidung)
    - Sonst INSERT
    """
    payload = data.copy()
    norm = normalize_detail_url(payload.get("detail_url") or "")
    payload["detail_url_normalized"] = norm if norm else None
    payload["price"] = _sanitize_numeric_for_db(payload.get("price"))
    payload["property_size_m2"] = _sanitize_numeric_for_db(payload.get("property_size_m2"))
    payload["land_area_m2"] = _sanitize_numeric_for_db(payload.get("land_area_m2"))

    if USE_POSTGRES:
        payload["features"] = Json(payload.get("features", []) or [])
        payload["images"] = Json(payload.get("images", []) or [])
    else:
        payload["features"] = json.dumps(payload.get("features", []), ensure_ascii=False)
        payload["images"] = json.dumps(payload.get("images", []) or [], ensure_ascii=False)
    ld = payload.get("location_district")
    if isinstance(ld, str) and len(ld) > 512:
        payload["location_district"] = ld[:512].rstrip()

    fields = [
        "property_id", "source_website", "source_name", "detail_url", "detail_url_normalized", "title", "price",
        "currency", "property_size_m2", "land_area_m2", "bedrooms", "bathrooms", "garage",
        "property_type", "property_status", "floor", "furnished", "features", "images",
        "google_maps_url", "latitude", "longitude", "location_city", "location_area", "location_district",
        "description", "source_listing_updated", "is_scraped",
    ]

    cursor = _dict_cursor(conn)
    cursor.execute(
        """
        SELECT id FROM properties
        WHERE source_website = %s AND property_id = %s
        """,
        (payload["source_website"], payload["property_id"]),
    )
    exists_pid = cursor.fetchone()
    cursor.close()

    def _run_update(where_field: str, where_val):
        # property_id mit aktualisieren (wichtig bei Merge über gleiche detail_url_normalized)
        set_clause = ", ".join([f"{field} = %s" for field in fields])
        values = [payload.get(field) for field in fields]
        values.extend([True, utc_now(), utc_now(), 0, None, None, where_val])
        cursor = conn.cursor()
        cursor.execute(
            f"""
            UPDATE properties
            SET {set_clause},
                is_active = %s,
                last_seen = %s,
                scraped_at = %s,
                scrape_fail_count = %s,
                last_scrape_error_at = %s,
                last_scrape_error_type = %s
            WHERE {where_field} = %s
            """,
            tuple(values),
        )
        conn.commit()
        cursor.close()

    if exists_pid:
        _run_update("id", exists_pid["id"])
        return "updated"

    if norm:
        cursor = _dict_cursor(conn)
        cursor.execute(
            """
            SELECT id, property_id FROM properties
            WHERE source_website = %s AND detail_url_normalized = %s
            """,
            (payload["source_website"], norm),
        )
        exists_url = cursor.fetchone()
        cursor.close()
        if exists_url:
            _run_update("id", exists_url["id"])
            return "updated"

    placeholders = ", ".join(["%s"] * len(fields))
    cursor = conn.cursor()
    cursor.execute(
        f"""
        INSERT INTO properties ({", ".join(fields)}, is_active, last_seen, scraped_at, scrape_fail_count, last_scrape_error_at, last_scrape_error_type)
        VALUES ({placeholders}, %s, %s, %s, %s, %s, %s)
        """,
        tuple([payload.get(field) for field in fields] + [True, utc_now(), utc_now(), 0, None, None]),
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
