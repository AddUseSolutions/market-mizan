#!/usr/bin/env python3
"""
Market Mizan – Manueller Scraper-Start
Verwendung: python run_scraper.py
             python run_scraper.py --source realethio
             python run_scraper.py --test
             python run_scraper.py --limit 10
           Full Addis crawl + DB cleanup of removed listings: omit --limit (see .env.example for REALETHIO_* / SCRAPER_* tuning on Render).
"""
import argparse
import logging
import time
from datetime import datetime, timezone

from scrapers.realethio_crawl4ai_scraper import RealEthioScraper
from utils.db import deactivate_missing, ensure_properties_schema, get_connection, log_scrape, upsert_property


def setup_logger():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


def run_source(source_name, test_mode=False, limit=None):
    started = datetime.now(timezone.utc)
    conn = get_connection()
    ensure_properties_schema(conn)
    new_count = 0
    updated_count = 0
    deactivated_count = 0
    scraped_ids = []

    try:
        if source_name != "realethio":
            raise ValueError(f"Unbekannte Quelle: {source_name}")

        print("🚀 Starte Scraper:", source_name)
        scraper = RealEthioScraper(test_mode=test_mode, limit=limit)
        properties = scraper.scrape()
        print(f"📦 Gefundene Inserate: {len(properties)}")

        for idx, prop in enumerate(properties, start=1):
            status = upsert_property(conn, prop)
            scraped_ids.append(prop["property_id"])
            if status == "new":
                new_count += 1
                emoji = "🆕"
            else:
                updated_count += 1
                emoji = "🔄"
            print(f"{emoji} ({idx}/{len(properties)}) {prop['property_id']} - {prop.get('title', 'Ohne Titel')}")

        # Only run deactivation on full syncs. Limited/test runs would otherwise
        # incorrectly mark many still-valid listings as inactive.
        if limit or test_mode:
            print("ℹ️ Überspringe Deaktivierung bei --limit/--test Lauf.")
            deactivated_count = 0
        else:
            deactivated_count = deactivate_missing(conn, "realethio.com", scraped_ids)
        finished = datetime.now(timezone.utc)
        log_scrape(
            conn=conn,
            source="realethio.com",
            started=started,
            finished=finished,
            found=len(properties),
            new=new_count,
            updated=updated_count,
            deactivated=deactivated_count,
            status="success",
        )
        return len(properties), new_count, updated_count, deactivated_count, started, finished, None
    except Exception as exc:
        finished = datetime.now(timezone.utc)
        log_scrape(
            conn=conn,
            source="realethio.com",
            started=started,
            finished=finished,
            found=0,
            new=0,
            updated=0,
            deactivated=0,
            status="error",
            error=str(exc),
        )
        return 0, 0, 0, 0, started, finished, exc
    finally:
        conn.close()


def main():
    setup_logger()
    parser = argparse.ArgumentParser(description="Market Mizan Scraper Runner")
    parser.add_argument("--source", default="realethio", help="Quelle, z.B. realethio")
    parser.add_argument("--test", action="store_true", help="Nur 3 Immobilien laden")
    parser.add_argument("--limit", type=int, default=0, help="Temporäres Limit, 0 = unbegrenzt (Standard)")
    args = parser.parse_args()

    wall_start = time.time()
    limit = args.limit if args.limit and args.limit > 0 else None
    found, new_count, updated_count, deactivated_count, started, finished, error = run_source(
        args.source,
        args.test,
        limit,
    )
    duration_min = round((time.time() - wall_start) / 60, 2)

    if error:
        print(f"💥 Fehler: {error}")
    print("\n📊 Zusammenfassung")
    print(f"✅ Neue Inserate: {new_count}")
    print(f"🔄 Aktualisiert: {updated_count}")
    print(f"❌ Deaktiviert: {deactivated_count}")
    print(f"📦 Gefunden: {found}")
    print(f"⏱️  Dauer: {duration_min} Minuten")
    print(f"🕒 Start: {started} | Ende: {finished}")


if __name__ == "__main__":
    main()
