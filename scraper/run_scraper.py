#!/usr/bin/env python3
"""
Market Mizan – Manueller Scraper-Start
Verwendung: python run_scraper.py
             python run_scraper.py --source realethio
             python run_scraper.py --test
             python run_scraper.py --limit 10
           Ablauf: (1) URL-Sync von den Übersichtsseiten, (2) Orphan-Soft-Delete vs. DB,
           (3) Detail-LLM nur für neue oder veraltete Inserate — Stundenfenster nur per
           Umgebungsvariable SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS (z. B. 336 = 14 Tage).
           Voller Lauf ohne --limit/--test: entfernte Listings per is_active=FALSE (kein Hard-Delete).
"""
import argparse
import logging
import os
import time
from datetime import datetime, timezone

from scrapers.realethio_crawl4ai_scraper import RealEthioScraper
from utils.db import (
    deactivate_orphans_not_in_sync,
    ensure_properties_schema,
    get_connection,
    list_urls_needing_detail_scrape_with_reasons,
    log_scrape,
    mark_scrape_failure_by_url,
    normalize_detail_url,
    upsert_property,
)


def _skip_scrape_hours() -> float:
    raw = os.getenv("SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS", "").strip()
    if not raw:
        raise RuntimeError(
            "SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS ist nicht gesetzt (z. B. 336 für 14 Tage)."
        )
    try:
        return float(raw)
    except ValueError as exc:
        raise RuntimeError(
            f"SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS muss eine Zahl sein, nicht {raw!r}."
        ) from exc


def _float_env(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


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
    found_count = 0
    skip_hours = _skip_scrape_hours()
    not_found_cooldown_hours = _float_env("SCRAPER_NOT_FOUND_COOLDOWN_HOURS", 168.0)
    not_found_deactivate_after = _int_env("SCRAPER_NOT_FOUND_DEACTIVATE_AFTER_FAILS", 2)
    discovered_urls = []

    try:
        if source_name != "realethio":
            raise ValueError(f"Unbekannte Quelle: {source_name}")

        print("🚀 Starte Scraper:", source_name)
        scraper = RealEthioScraper(test_mode=test_mode, limit=limit)

        print("📡 Phase 1: URL-Sync (ohne LLM) …")
        discovered_urls = scraper.discover_listing_urls()
        sync_normalized = {normalize_detail_url(u) for u in discovered_urls if normalize_detail_url(u)}
        print(f"   → {len(discovered_urls)} Detail-URLs auf der Seite gefunden.")

        # Only run orphan deactivation on full syncs. Limited/test runs would otherwise
        # incorrectly mark many still-valid listings as inactive.
        if limit or test_mode:
            print("ℹ️ Phase 2: Überspringe Orphan-Deaktivierung bei --limit/--test.")
            deactivated_count = 0
        else:
            print("📡 Phase 2: Orphan-Erkennung (Soft-Delete) …")
            deactivated_count = deactivate_orphans_not_in_sync(conn, "realethio.com", sync_normalized)
            print(f"   → {deactivated_count} Inserate als inaktiv markiert (nicht mehr auf der Seite).")

        print(
            f"📡 Phase 3: Detail-Scrape (LLM) — Kandidaten nach Frischefenster "
            f"({skip_hours:g}h / SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS) …"
        )
        candidates, candidate_reasons = list_urls_needing_detail_scrape_with_reasons(
            conn, "realethio.com", discovered_urls, skip_hours, not_found_cooldown_hours
        )
        print(f"   → {len(candidates)} URLs benötigen Detail-Extraktion (von {len(discovered_urls)} im Sync).")
        if candidates:
            print("   → Gründe für Crawl4ai-Kandidaten:")
            for i, u in enumerate(candidates, start=1):
                reason = candidate_reasons.get(u, "unknown")
                print(f"      {i:>3}. {reason} | {u}")

        if not candidates:
            stream_summary = {"discovered": 0, "extracted": 0}
            print("   → Keine Detail-Scrapes nötig (alles frisch genug).")
        else:

            def persist_property(prop, idx, detail_total):
                nonlocal new_count, updated_count, found_count
                status = upsert_property(conn, prop)
                found_count += 1
                if status == "new":
                    new_count += 1
                    emoji = "🆕"
                else:
                    updated_count += 1
                    emoji = "🔄"
                print(f"{emoji} ({idx}/{detail_total}) {prop['property_id']} - {prop.get('title', 'Ohne Titel')}")

            def persist_failure(url: str, error_type: str, message: str):
                if error_type != "not_found" or not url:
                    return
                mark_scrape_failure_by_url(
                    conn,
                    source_website="realethio.com",
                    detail_url=url,
                    error_type=error_type,
                    deactivate_after_failures=not_found_deactivate_after,
                )
                print(
                    f"⚠️ Not-Found erkannt, Cooldown aktiv: {url} "
                    f"(deaktivieren nach {not_found_deactivate_after} Fehlversuchen)"
                )

            stream_summary = scraper.scrape_stream_for_urls(
                candidates,
                on_property=persist_property,
                on_failure=persist_failure,
            )
            found_count = stream_summary.get("extracted", found_count)

        discovered_total = len(discovered_urls)
        print(
            f"📦 Sync: {discovered_total} URLs | Detail-Extraktionen (erfolgreich): {found_count} "
            f"(neu {new_count}, aktualisiert {updated_count})"
        )
        finished = datetime.now(timezone.utc)
        log_scrape(
            conn=conn,
            source="realethio.com",
            started=started,
            finished=finished,
            found=len(discovered_urls),
            new=new_count,
            updated=updated_count,
            deactivated=deactivated_count,
            status="success",
        )
        return found_count, new_count, updated_count, deactivated_count, len(discovered_urls), started, finished, None
    except Exception as exc:
        finished = datetime.now(timezone.utc)
        log_scrape(
            conn=conn,
            source="realethio.com",
            started=started,
            finished=finished,
            found=len(discovered_urls),
            new=new_count,
            updated=updated_count,
            deactivated=0,
            status="error",
            error=str(exc),
        )
        return found_count, new_count, updated_count, 0, len(discovered_urls), started, finished, exc
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
    detail_ok, new_count, updated_count, deactivated_count, sync_urls, started, finished, error = run_source(
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
    print(f"📡 URLs im Sync: {sync_urls}")
    print(f"📦 Detail-Extraktionen (erfolgreich): {detail_ok}")
    print(f"⏱️  Dauer: {duration_min} Minuten")
    print(f"🕒 Start: {started} | Ende: {finished}")


if __name__ == "__main__":
    main()
