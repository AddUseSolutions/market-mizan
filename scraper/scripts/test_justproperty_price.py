#!/usr/bin/env python3
"""
Fetch one just.property listing, switch currency to USD (site API = same as dropdown), verify prices.

Usage:
  cd scraper && python scripts/test_justproperty_price.py
  cd scraper && python scripts/test_justproperty_price.py --upsert
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cloudscraper
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from utils.justproperty_currency import apply_site_converted_prices, convert_listing_prices
from utils.justproperty_price import extract_justproperty_base_price

DEFAULT_URL = (
    "https://www.just.property/results/residential/to-let/bole/bole-airport/apartment/3290812/#overview"
)


def fetch_html(url: str) -> str:
    scraper = cloudscraper.create_scraper()
    resp = scraper.get(url, timeout=60)
    resp.raise_for_status()
    return resp.text


def main() -> int:
    load_dotenv()
    parser = argparse.ArgumentParser(description="Test just.property USD conversion via site FX API")
    parser.add_argument("--url", default=DEFAULT_URL, help="Listing detail URL")
    parser.add_argument("--upsert", action="store_true", help="Upsert normalized row to DATABASE_URL")
    args = parser.parse_args()

    print(f"Fetching {args.url} …")
    soup = BeautifulSoup(fetch_html(args.url), "html.parser")

    zar_amount, base_ccy = extract_justproperty_base_price(soup)
    if zar_amount is None:
        print("FAIL: could not extract base ZAR price")
        return 1

    print(f"Base price on site: {zar_amount:,.2f} {base_ccy or 'ZAR'}")

    converted = convert_listing_prices(zar_amount)
    print(
        f"Site FX → USD {converted['price_usd']:,.2f} (dropdown) | "
        f"ETB {converted['price_etb']:,.2f} (USD→ETB) | "
        f"etb/usd={converted['fx_rate_etb_usd']:.2f} | date={converted['fx_rate_date']}"
    )

    payload = apply_site_converted_prices({}, zar_amount)
    etb = float(payload.get("price_etb") or 0)
    usd = float(payload.get("price_usd") or 0)
    if etb < 8000 or usd < 80:
        print("WARN: below rental plausibility threshold")

    if args.upsert:
        from scrapers.realethio_crawl4ai_scraper import RealEthioScraper
        from utils.db import ensure_properties_schema, get_connection, upsert_property

        jp_scraper = RealEthioScraper(site="justproperty")
        normalized = jp_scraper._normalize_property(
            {
                "price": usd,
                "currency": "USD",
                "title": "Test listing",
                **payload,
            },
            args.url.split("#")[0],
        )
        normalized["verification_status"] = "verified"
        normalized["publisher_type"] = "broker"
        conn = get_connection()
        ensure_properties_schema(conn)
        status = upsert_property(conn, normalized)
        conn.close()
        print(f"DB upsert: {status} ({normalized.get('property_id')})")

    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
