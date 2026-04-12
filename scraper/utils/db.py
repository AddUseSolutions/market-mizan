import json
import os
from datetime import datetime, timezone

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
        "description", "source_listing_updated",
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
