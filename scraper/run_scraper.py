#!/usr/bin/env python3
"""
Market Mizan – Manueller Scraper-Start
Verwendung: python run_scraper.py
             python run_scraper.py --source all
             python run_scraper.py --source realethio
             python run_scraper.py --source ethiopiarealty
             python run_scraper.py --source justproperty
             python run_scraper.py --test
             python run_scraper.py --limit 10
           Ablauf pro Quelle: (1) URL-Sync (Sitemap / bei RealEthio optional Search),
           (2) Orphan-Soft-Delete vs. DB, (3) Detail-LLM nur für Delta (Kandidaten) —
           Stundenfenster nur per SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS (z. B. 336 = 14 Tage).
           --source all: zuerst RealEthio komplett, danach EthiopiaRealty (lineare Pipeline).
"""
import argparse
import logging
import os
import time
from collections import Counter
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from scrapers.realethio_crawl4ai_scraper import RealEthioScraper
from utils.db import (
    deactivate_orphans_not_in_sync,
    ensure_properties_schema,
    get_connection,
    list_justproperty_urls_needing_price_fix,
    list_urls_needing_detail_scrape_with_reasons,
    log_scrape,
    mark_scrape_failure_by_url,
    normalize_detail_url,
    upsert_property,
)


def _skip_scrape_hours() -> float:
    raw = os.getenv("SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS", "336").strip()
    if not raw:
        return 336.0
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


def _log_candidate_reasons(candidates, candidate_reasons):
    """Summarize why URLs need detail scrape — avoid dumping 1000+ lines in normal runs."""
    counts = Counter(candidate_reasons.get(u, "unknown") for u in candidates)
    print("   → Kandidaten nach Grund:")
    for reason, n in counts.most_common():
        label = {
            "stale_or_missing_scraped_at": "älter als Frischefenster oder ohne scraped_at (normal bei Vollsync)",
            "new_url_not_in_db": "neu auf der Quellseite",
            "reactivated_from_inactive": "wieder aktiv (war inaktiv)",
        }.get(reason, reason)
        print(f"      · {label}: {n}")
    verbose = os.getenv("SCRAPER_VERBOSE_CANDIDATES", "").lower() in ("1", "true", "yes")
    cap = len(candidates) if verbose else min(8, len(candidates))
    if cap and len(candidates) > cap:
        print(
            f"   → Beispiel-URLs ({cap} von {len(candidates)}; "
            "SCRAPER_VERBOSE_CANDIDATES=1 für alle):"
        )
    elif cap:
        print("   → Beispiel-URLs:")
    for i, u in enumerate(candidates[:cap], start=1):
        reason = candidate_reasons.get(u, "unknown")
        print(f"      {i:>3}. {reason} | {u}")


def setup_logger():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


def _run_single_site(
    conn,
    site_key: str,
    test_mode: bool,
    limit: Optional[int],
    skip_hours: float,
    not_found_cooldown_hours: float,
    not_found_deactivate_after: int,
) -> Tuple[int, int, int, int, int, datetime, datetime, Optional[Exception]]:
    """
    Returns:
        found_count (successful detail extractions), new_count, updated_count,
        deactivated_count, len(discovered_urls), started, finished, error
    """
    started = datetime.now(timezone.utc)
    new_count = 0
    updated_count = 0
    deactivated_count = 0
    found_count = 0
    discovered_urls: List[str] = []
    scraper = RealEthioScraper(site=site_key, test_mode=test_mode, limit=limit)
    src = scraper.source_website

    try:
        print(f"🚀 Starte Scraper: {site_key} ({src})")

        print("📡 Phase 1: URL-Sync (ohne LLM) …")
        discovered_urls = scraper.discover_listing_urls()
        sync_normalized = {normalize_detail_url(u) for u in discovered_urls if normalize_detail_url(u)}
        print(f"   → {len(discovered_urls)} Detail-URLs auf der Seite gefunden.")

        if limit or test_mode:
            print("ℹ️ Phase 2: Überspringe Orphan-Deaktivierung bei --limit/--test.")
            deactivated_count = 0
        else:
            print("📡 Phase 2: Orphan-Erkennung (Soft-Delete) …")
            deactivated_count = deactivate_orphans_not_in_sync(conn, src, sync_normalized)
            print(f"   → {deactivated_count} Inserate als inaktiv markiert (nicht mehr auf der Seite).")

        print(
            f"📡 Phase 3: Detail-Scrape (LLM) — Kandidaten nach Frischefenster "
            f"({skip_hours:g}h / SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS) …"
        )
        candidates, candidate_reasons = list_urls_needing_detail_scrape_with_reasons(
            conn, src, discovered_urls, skip_hours, not_found_cooldown_hours
        )
        if site_key == "justproperty":
            price_fix_urls = list_justproperty_urls_needing_price_fix(conn)
            if price_fix_urls:
                seen = {normalize_detail_url(u) for u in candidates if normalize_detail_url(u)}
                added = 0
                for u in price_fix_urls:
                    n = normalize_detail_url(u)
                    if n and n not in seen:
                        candidates.append(u)
                        candidate_reasons[u] = "jp_price_needs_site_usd_fix"
                        seen.add(n)
                        added += 1
                if added:
                    print(f"   → +{added} Just Property URLs mit falschem USD (Site-API-Neuberechnung).")
        print(f"   → {len(candidates)} URLs benötigen Detail-Extraktion (von {len(discovered_urls)} im Sync).")
        if candidates:
            _log_candidate_reasons(candidates, candidate_reasons)

        if not candidates:
            print("   → Keine Detail-Scrapes nötig (alles frisch genug).")
        else:

            def persist_property(prop, idx, detail_total):
                nonlocal new_count, updated_count, found_count
                try:
                    status = upsert_property(conn, prop)
                except Exception as exc:
                    # Keep the run alive when a single row is malformed/out-of-range.
                    conn.rollback()
                    print(
                        f"⚠️ Upsert übersprungen ({idx}/{detail_total}) "
                        f"{prop.get('detail_url', '')} | {exc}"
                    )
                    return
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
                    source_website=src,
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
            f"📦 [{src}] Sync: {discovered_total} URLs | Detail-Extraktionen (erfolgreich): {found_count} "
            f"(neu {new_count}, aktualisiert {updated_count})"
        )
        finished = datetime.now(timezone.utc)
        log_scrape(
            conn=conn,
            source=src,
            started=started,
            finished=finished,
            found=len(discovered_urls),
            new=new_count,
            updated=updated_count,
            deactivated=deactivated_count,
            status="success",
        )
        return (
            found_count,
            new_count,
            updated_count,
            deactivated_count,
            len(discovered_urls),
            started,
            finished,
            None,
        )
    except Exception as exc:
        try:
            conn.rollback()
        except Exception:
            pass
        finished = datetime.now(timezone.utc)
        try:
            log_scrape(
                conn=conn,
                source=src,
                started=started,
                finished=finished,
                found=len(discovered_urls),
                new=new_count,
                updated=updated_count,
                deactivated=0,
                status="error",
                error=str(exc),
            )
        except Exception as log_exc:
            print(f"⚠️ Konnte scrape_logs nicht schreiben ({src}): {log_exc}")
        return found_count, new_count, updated_count, 0, len(discovered_urls), started, finished, exc


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
    discovered_urls_total = 0
    sites: List[str]
    if source_name == "all":
        sites = ["realethio", "ethiopiarealty", "justproperty"]
    elif source_name == "realethio":
        sites = ["realethio"]
    elif source_name == "ethiopiarealty":
        sites = ["ethiopiarealty"]
    elif source_name == "justproperty":
        sites = ["justproperty"]
    else:
        conn.close()
        raise ValueError(f"Unbekannte Quelle: {source_name}")

    last_error: Optional[Exception] = None
    try:
        if len(sites) > 1:
            print("🚀 Lineare Pipeline: RealEthio → EthiopiaRealty → Just Property")

        for sk in sites:
            fc, nc, uc, dc, sync_n, _st, _fi, err = _run_single_site(
                conn,
                sk,
                test_mode,
                limit,
                skip_hours,
                not_found_cooldown_hours,
                not_found_deactivate_after,
            )
            found_count += fc
            new_count += nc
            updated_count += uc
            deactivated_count += dc
            discovered_urls_total += sync_n
            if err:
                last_error = err
                print(f"💥 Fehler bei {sk}: {err}")

        finished = datetime.now(timezone.utc)
        if last_error:
            return (
                found_count,
                new_count,
                updated_count,
                deactivated_count,
                discovered_urls_total,
                started,
                finished,
                last_error,
            )
        return (
            found_count,
            new_count,
            updated_count,
            deactivated_count,
            discovered_urls_total,
            started,
            finished,
            None,
        )
    finally:
        conn.close()


def main():
    setup_logger()
    parser = argparse.ArgumentParser(description="Market Mizan Scraper Runner")
    parser.add_argument(
        "--source",
        default="all",
        help="Quelle: all (RealEthio, EthiopiaRealty, Just Property), realethio, ethiopiarealty, justproperty",
    )
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
        print(f"💥 Fehler (mindestens eine Quelle): {error}")
    print("\n📊 Zusammenfassung (alle durchlaufenen Quellen)")
    print(f"✅ Neue Inserate: {new_count}")
    print(f"🔄 Aktualisiert: {updated_count}")
    print(f"❌ Deaktiviert: {deactivated_count}")
    print(f"📡 URLs im Sync (Summe): {sync_urls}")
    print(f"📦 Detail-Extraktionen (erfolgreich): {detail_ok}")
    print(f"⏱️  Dauer: {duration_min} Minuten")
    print(f"🕒 Start: {started} | Ende: {finished}")


if __name__ == "__main__":
    main()
