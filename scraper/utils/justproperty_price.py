"""Deterministic base-price extraction for just.property (listings default to ZAR)."""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from bs4 import BeautifulSoup

from utils.helpers import clean_text, parse_number


def _walk_json_ld(node: Any):
    if isinstance(node, dict):
        yield node
        for value in node.values():
            yield from _walk_json_ld(value)
    elif isinstance(node, list):
        for item in node:
            yield from _walk_json_ld(item)


def extract_justproperty_base_price(soup: BeautifulSoup) -> tuple[Optional[float], Optional[str]]:
    """Base listing price in ZAR from JSON-LD or window.listing_event."""
    for script in soup.select('script[type="application/ld+json"]'):
        raw = clean_text(script.string or script.get_text() or "")
        if not raw:
            continue
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            continue
        for block in _walk_json_ld(parsed):
            offers = block.get("offers")
            if isinstance(offers, list):
                offers = offers[0] if offers else None
            if not isinstance(offers, dict):
                continue
            price = parse_number(str(offers.get("price") or ""))
            currency = (clean_text(offers.get("priceCurrency")) or "ZAR").upper()
            if price is not None and price > 0:
                return price, currency

    for script in soup.find_all("script"):
        text = script.string or script.get_text() or ""
        if "listing_event" not in text:
            continue
        match = re.search(
            r"listing_event\s*=\s*\{[^}]*\bprice\s*:\s*([0-9]+(?:\.[0-9]+)?)[^}]*\bcurrency\s*:\s*['\"]([A-Za-z]{3})['\"]",
            text,
            re.DOTALL,
        )
        if match:
            price = parse_number(match.group(1))
            currency = match.group(2).upper()
            if price is not None and price > 0:
                return price, currency
        match = re.search(
            r"listing_event\s*=\s*\{[^}]*\bcurrency\s*:\s*['\"]([A-Za-z]{3})['\"][^}]*\bprice\s*:\s*([0-9]+(?:\.[0-9]+)?)",
            text,
            re.DOTALL,
        )
        if match:
            currency = match.group(1).upper()
            price = parse_number(match.group(2))
            if price is not None and price > 0:
                return price, currency

    price_el = soup.select_one(".price, [class*='price']")
    if price_el:
        text = clean_text(price_el.get_text(" ", strip=True) or "")
        if text:
            price = parse_number(text)
            if price is not None and price > 0:
                if "$" in text:
                    return price, "USD"
                if "R" in text or "ZAR" in text.upper():
                    return price, "ZAR"

    return None, None


# Backwards-compatible alias
def extract_justproperty_price(soup: BeautifulSoup) -> tuple[Optional[float], Optional[str]]:
    return extract_justproperty_base_price(soup)
