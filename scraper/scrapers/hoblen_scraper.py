"""
Hoblen.com Ethiopia listings (developer / verified projects).
Public JSON API at api.hoblen.com — Origin/Referer from hoblen.com required.
"""
from __future__ import annotations

import logging
import random
import re
import time
from typing import Callable, Dict, List, Optional
from urllib.parse import urljoin

import requests

from utils.canonical_areas import apply_canonical_area
from utils.fx_rate import get_etb_per_usd
from utils.helpers import clean_text, parse_number
from utils.listing_content import clean_original_description, limit_images, summarize_description

API_BASE = "https://api.hoblen.com"
SITE_BASE = "https://hoblen.com"
LIST_PATH = "/user/property"
DETAIL_PATH = "/user/property/{id}"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]


def _headers() -> Dict[str, str]:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "application/json",
        "Origin": SITE_BASE,
        "Referer": f"{SITE_BASE}/property",
    }


def _bedrooms_from(raw) -> Optional[float]:
    if isinstance(raw, (int, float)):
        return float(raw)
    if isinstance(raw, list):
        nums = []
        for item in raw:
            n = parse_number(str(item))
            if n is not None:
                nums.append(n)
            elif isinstance(item, str) and "studio" in item.lower():
                nums.append(0)
        return max(nums) if nums else None
    if isinstance(raw, str):
        return parse_number(raw)
    return None


def _price_pair(item: dict) -> Dict[str, Optional[float]]:
    currency = str(item.get("currency") or "ETB").upper()
    sale_type = str(item.get("saleType") or "").upper()
    price_type = str(item.get("priceType") or "").upper()
    rate = get_etb_per_usd()
    etb = None
    usd = None

    raw = None
    if sale_type == "RENT":
        raw = item.get("rentalPrice")
    else:
        raw = item.get("specificPrice")
        if raw in (None, 0, "0", ""):
            pr = item.get("priceRange") or {}
            if isinstance(pr, dict):
                # Use the published floor so cards can show a real starting price.
                raw = pr.get("min") or pr.get("from") or pr.get("low")
        if raw in (None, 0, "0", "") and price_type == "PRICE_PER_SQUARE_METER":
            raw = item.get("pricePerSquareMeter")

    amount = parse_number(raw) if raw not in (None, "") else None
    if amount and amount > 0:
        if currency == "USD":
            usd = amount
            etb = round(amount * rate, 2)
        else:
            etb = amount
            usd = round(amount / rate, 2)
    return {"price_etb": etb, "price_usd": usd, "currency": currency if amount else "ETB"}


def _images(item: dict) -> List[str]:
    out: List[str] = []
    cover = item.get("cover") or {}
    if isinstance(cover, dict):
        for key in ("processedUrl", "url", "thumbnailUrl"):
            u = cover.get(key)
            if isinstance(u, str) and u.startswith("http"):
                out.append(u)
                break
    for media in item.get("media") or []:
        if not isinstance(media, dict):
            continue
        if str(media.get("type") or "").upper() not in ("IMAGE", "IMG", ""):
            continue
        for key in ("processedUrl", "url", "thumbnailUrl"):
            u = media.get(key)
            if isinstance(u, str) and u.startswith("http"):
                out.append(u)
                break
    image = item.get("image")
    if isinstance(image, str) and image.startswith("http"):
        out.append(image)
    return limit_images(list(dict.fromkeys(out)))


def _furnished(item: dict) -> bool:
    status = str(item.get("furnishingStatus") or "").lower()
    if "unfurnish" in status or "not furnish" in status:
        return False
    return "furnish" in status


class HoblenScraper:
    source_website = "hoblen.com"
    source_name = "Hoblen"

    def __init__(self, test_mode: bool = False, limit: Optional[int] = None, site: str = "hoblen"):
        self.test_mode = test_mode
        self.limit = limit
        self.logger = logging.getLogger(self.__class__.__name__)
        self.session = requests.Session()
        self.last_request_time = 0.0

    def _rate_limit(self):
        elapsed = time.time() - self.last_request_time
        wait = 0.8 - elapsed
        if wait > 0:
            time.sleep(wait)

    def _get_json(self, path: str, params: Optional[dict] = None) -> Optional[dict]:
        self._rate_limit()
        url = urljoin(API_BASE, path)
        try:
            response = self.session.get(url, headers=_headers(), params=params or {}, timeout=40)
            self.last_request_time = time.time()
            if response.status_code >= 400:
                self.logger.warning("HTTP %s for %s", response.status_code, url)
                return None
            return response.json()
        except Exception as exc:
            self.logger.warning("Fetch failed %s: %s", url, exc)
            self.last_request_time = time.time()
            return None

    def discover_listing_urls(self) -> List[str]:
        """Return canonical site detail URLs (one per Hoblen property)."""
        found: List[str] = []
        page = 1
        limit = 50
        max_pages = 1 if self.test_mode else 20
        while page <= max_pages:
            payload = self._get_json(LIST_PATH, {"page": page, "limit": limit})
            data = (payload or {}).get("data") or {}
            rows = data.get("properties") or []
            if not rows:
                break
            for row in rows:
                oid = row.get("_id")
                if not oid:
                    continue
                found.append(f"{SITE_BASE}/property/detail/{oid}")
                if self.limit and len(found) >= self.limit:
                    return found
            total_pages = int(data.get("totalPages") or page)
            self.logger.info("hoblen.com list page=%s +%s (total=%s / pages=%s)", page, len(rows), len(found), total_pages)
            if page >= total_pages or not data.get("hasMore", page < total_pages):
                break
            page += 1
            time.sleep(random.uniform(0.4, 1.0))
        return found

    def parse_api_item(self, item: dict) -> Optional[dict]:
        oid = item.get("_id")
        if not oid:
            return None
        title = clean_text(item.get("name") or "")
        if not title:
            return None

        sale_type = str(item.get("saleType") or "SELL").upper()
        status = "For Rent" if sale_type == "RENT" else "For Sale"
        prices = _price_pair(item)
        etb, usd = prices["price_etb"], prices["price_usd"]
        rate = get_etb_per_usd()

        addr = item.get("address") or {}
        coords = (addr.get("location") or {}).get("coordinates") or []
        lng = float(coords[0]) if len(coords) >= 2 and coords[0] is not None else None
        lat = float(coords[1]) if len(coords) >= 2 and coords[1] is not None else None

        area_hint = clean_text(addr.get("addressLine1") or "") or ""
        city = clean_text(addr.get("city") or "Addis Ababa") or "Addis Ababa"
        for token in ("Bole", "Yeka", "Kirkos", "Arada", "Lideta", "Nifas Silk", "CMC", "Kazanchis", "Old Airport"):
            if token.lower() in area_hint.lower():
                area_hint = token
                break

        description = clean_original_description(item.get("description") or "")
        images = _images(item)
        property_id = str(item.get("propertyId") or f"HL{oid[-7:]}")
        detail_url = f"{SITE_BASE}/property/detail/{oid}"

        bedrooms = _bedrooms_from(item.get("bedrooms"))
        bathrooms = parse_number(item.get("bathrooms"))
        size_m2 = parse_number(item.get("size")) if item.get("size") not in (None, 0, "0") else None

        features = []
        for feat in item.get("keyFeatures") or item.get("propertyFeatures") or []:
            if isinstance(feat, str):
                features.append(clean_text(feat))
            elif isinstance(feat, dict):
                features.append(clean_text(feat.get("name") or feat.get("label") or ""))
        features = [f for f in features if f][:24]
        if item.get("furnishingStatus"):
            features.insert(0, clean_text(str(item.get("furnishingStatus"))))

        original_type = clean_text(item.get("propertyType") or "Apartment") or "Apartment"
        # Admin-facing “New Building” category (Buy + Rent). Keep the site type in features.
        property_type = "New Building"
        if original_type and original_type.lower() != "new building":
            features.insert(0, original_type)
        if item.get("underConstruction"):
            features.append("Under construction")

        row = {
            "property_id": property_id[:50],
            "source_website": self.source_website,
            "source_name": self.source_name,
            "detail_url": detail_url,
            "title": title[:255],
            "price": etb,
            "price_etb": etb,
            "price_usd": usd,
            "fx_rate_etb_usd": rate,
            "currency": prices["currency"],
            "property_size_m2": size_m2,
            "land_area_m2": None,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "garage": parse_number(item.get("garage")),
            "property_type": property_type[:80],
            "property_status": status,
            "floor": None,
            "furnished": _furnished(item),
            "features": features,
            "images": images,
            "google_maps_url": None,
            "latitude": lat,
            "longitude": lng,
            "location_city": city,
            "location_area": area_hint or None,
            "location_district": area_hint or None,
            "description_original": description,
            "is_scraped": True,
            "listing_origin": "crawled",
            "verification_status": "verified" if item.get("isVerified") else "unverified",
            "is_paid": False,
            "publisher_type": "developer",
        }
        if row["verification_status"] == "verified":
            row["verified_at"] = item.get("updatedAt") or item.get("createdAt")
        row = apply_canonical_area(row)
        summary = summarize_description(row, description)
        row["description"] = summary
        row["description_summary"] = summary
        return row

    def scrape_stream_for_urls(
        self,
        urls: List[str],
        on_property: Optional[Callable] = None,
        on_failure: Optional[Callable] = None,
    ) -> Dict[str, int]:
        extracted = 0
        total = len(urls)
        for idx, url in enumerate(urls, start=1):
            m = re.search(r"/property/detail/([a-f0-9]+)", url, re.I)
            if not m:
                if on_failure:
                    on_failure(url, "parse_error", "missing hoblen id")
                continue
            oid = m.group(1)
            payload = self._get_json(DETAIL_PATH.format(id=oid))
            item = ((payload or {}).get("data") or {}).get("property")
            if not item:
                if on_failure:
                    on_failure(url, "fetch_error", "empty property")
                continue
            try:
                prop = self.parse_api_item(item)
            except Exception as exc:
                self.logger.warning("Parse failed %s: %s", url, exc)
                if on_failure:
                    on_failure(url, "parse_error", str(exc))
                continue
            if not prop:
                if on_failure:
                    on_failure(url, "parse_error", "empty property")
                continue
            extracted += 1
            if on_property:
                on_property(prop, idx, total)
            time.sleep(random.uniform(0.35, 0.9))
        return {"extracted": extracted}
