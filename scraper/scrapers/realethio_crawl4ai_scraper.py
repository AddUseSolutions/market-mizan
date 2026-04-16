import asyncio
import hashlib
import json
import logging
import os
import random
import re
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode, urljoin, urlparse

import cloudscraper
from bs4 import BeautifulSoup
from crawl4ai import (
    AsyncWebCrawler,
    BrowserConfig,
    CacheMode,
    CrawlerRunConfig,
    LLMConfig,
    LLMExtractionStrategy,
)
from pydantic import BaseModel, Field

from config import SCRAPER_SLEEP_MAX, SCRAPER_SLEEP_MIN
from utils.helpers import clean_text, parse_lat_lng_from_url, parse_number

# Addis-only search (HTML discovery; WP REST /wp-json/ often returns 403 for bots).
_DEFAULT_ADDIS_QUERY = [
    ("type[]", ""),
    ("location[]", "addis-ababa"),
    ("areas[]", ""),
    ("bedrooms", ""),
    ("furnished", ""),
    ("bathrooms", ""),
    ("property_id", ""),
    ("min-price", ""),
    ("max-price", ""),
    ("min-area", ""),
    ("max-area", ""),
]


class PropertySchema(BaseModel):
    """Structured extraction contract for listing detail pages."""

    property_id: Optional[str] = Field(default=None, description="Unique listing id from source site.")
    title: Optional[str] = Field(default=None, description="Listing title/headline.")
    description: Optional[str] = Field(default=None, description="Main textual description.")
    price: Optional[str] = Field(default=None, description="Price string as displayed, including currency text.")
    currency: Optional[str] = Field(default="ETB", description="Price currency.")
    property_type: Optional[str] = Field(default=None, description="Type such as apartment or house.")
    property_status: Optional[str] = Field(default=None, description="For rent / for sale status.")
    bedrooms: Optional[int] = Field(default=None, description="Number of bedrooms.")
    bathrooms: Optional[int] = Field(default=None, description="Number of bathrooms.")
    garage: Optional[int] = Field(default=None, description="Number of garage spaces if available.")
    property_size_m2: Optional[float] = Field(default=None, description="Built area in square meters.")
    land_area_m2: Optional[float] = Field(default=None, description="Land area in square meters.")
    furnished: Optional[bool] = Field(default=None, description="Whether listing is furnished.")
    location_city: Optional[str] = Field(default="Addis Ababa", description="City name.")
    location_area: Optional[str] = Field(default=None, description="Area/subcity.")
    location_district: Optional[str] = Field(default=None, description="District/street-level location text.")
    google_maps_url: Optional[str] = Field(default=None, description="Google maps link if present.")
    features: List[str] = Field(default_factory=list, description="Feature tags.")
    images: List[str] = Field(default_factory=list, description="Absolute image URLs for gallery.")
    source_listing_updated: Optional[str] = Field(default=None, description="Original site updated timestamp text.")


@dataclass
class ScrapeStats:
    found: int = 0
    new: int = 0
    updated: int = 0


class RealEthioScraper:
    source_website = "realethio.com"
    source_name = "RealEthio"

    def __init__(self, test_mode: bool = False, limit: Optional[int] = None):
        self.test_mode = test_mode
        self.limit = limit
        self.logger = logging.getLogger(self.__class__.__name__)
        self._sem = asyncio.Semaphore(int(os.getenv("SCRAPER_CONCURRENCY", "4")))
        # Keep batches tiny by default on Render cron instances to avoid OOM.
        self._batch_size = int(os.getenv("SCRAPER_BATCH_SIZE", "1"))
        self._detail_max_retries = int(os.getenv("REALETHIO_DETAIL_MAX_RETRIES", "2"))
        self._detail_retry_base_sec = float(os.getenv("REALETHIO_DETAIL_RETRY_BASE_SEC", "4"))
        self._detail_sleep_sec = float(os.getenv("REALETHIO_DETAIL_SLEEP_SEC", "0.5"))
        self._llm_provider = os.getenv("CRAWL4AI_LLM_PROVIDER", "openai/gpt-4o-mini")
        self._llm_token = os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_TOKEN")
        self._schema = (
            PropertySchema.model_json_schema()
            if hasattr(PropertySchema, "model_json_schema")
            else PropertySchema.schema()
        )

    @staticmethod
    def _fallback_property_id_from_url(url: str) -> str:
        h = hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]
        return f"RE{int(h, 16) % 1000000}"

    @staticmethod
    def _normalize_property_href(href: str) -> str:
        u = (href or "").strip()
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

    @staticmethod
    def _is_property_detail_url(url: str) -> bool:
        try:
            p = urlparse(url)
            host = (p.netloc or "").lower()
            if host not in ("realethio.com", "www.realethio.com"):
                return False
            parts = [x for x in p.path.strip("/").split("/") if x]
            return len(parts) >= 2 and parts[0] == "property"
        except Exception:
            return False

    def _addis_search_url(self, page: int) -> str:
        """Houzez-style pagination: /search-results/ and /search-results/page/N/."""
        q = urlencode(_DEFAULT_ADDIS_QUERY, doseq=True)
        if page <= 1:
            return f"https://realethio.com/search-results/?{q}"
        return f"https://realethio.com/search-results/page/{page}/?{q}"

    def _extract_property_urls_from_html(self, html: str) -> List[str]:
        found: List[str] = []
        seen_path = set()
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.select("a[href]"):
            href = a.get("href") or ""
            full = urljoin("https://realethio.com/", href)
            norm = self._normalize_property_href(full)
            if self._is_property_detail_url(norm):
                key = urlparse(norm).path.rstrip("/")
                if key and key not in seen_path:
                    seen_path.add(key)
                    found.append(norm)

        for m in re.finditer(
            r'https?://(?:www\.)?realethio\.com/property/[^\s"\'<>]+',
            html,
            re.I,
        ):
            norm = self._normalize_property_href(m.group(0))
            if self._is_property_detail_url(norm):
                key = urlparse(norm).path.rstrip("/")
                if key and key not in seen_path:
                    seen_path.add(key)
                    found.append(norm)
        return found

    def _fetch_search_page(self, session: cloudscraper.CloudScraper, url: str):
        """GET search HTML; retry on transient errors (503 often = rate limit)."""
        max_retries = int(os.getenv("REALETHIO_SEARCH_MAX_RETRIES", "8"))
        base = float(os.getenv("REALETHIO_SEARCH_RETRY_BASE_SEC", "10"))
        last = None
        for attempt in range(max_retries):
            last = session.get(url, timeout=90)
            if last.status_code not in (429, 502, 503, 504):
                return last
            if attempt < max_retries - 1:
                wait = min(180.0, base * (2 ** attempt)) + random.uniform(2, 8)
                self.logger.warning(
                    "search HTTP %s — retry %s/%s in %.0fs: %s",
                    last.status_code,
                    attempt + 1,
                    max_retries,
                    wait,
                    url,
                )
                time.sleep(wait)
        return last

    def _discover_listing_urls(self) -> List[str]:
        """
        Listings only for Addis Ababa via the site's search-results HTML (location=addis-ababa).
        Avoids /wp-json/ which often returns 403 on server IPs.
        """
        override = (os.getenv("REALETHIO_SEARCH_URL") or "").strip()
        max_pages = int(os.getenv("REALETHIO_MAX_SEARCH_PAGES", "200"))

        session = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "linux", "mobile": False}
        )
        session.headers.update(
            {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://realethio.com/",
            }
        )

        urls: List[str] = []
        seen = set()
        page = 1
        strict = (os.getenv("REALETHIO_STRICT_DISCOVERY", "").lower() in ("1", "true", "yes"))
        extra_sleep = float(os.getenv("REALETHIO_PAGINATION_EXTRA_SLEEP_SEC", "5"))

        while page <= max_pages:
            url = override if (page == 1 and override) else self._addis_search_url(page)
            self.logger.info("discovery fetch search page=%s %s", page, url)
            response = self._fetch_search_page(session, url)
            if response.status_code in (404, 410):
                self.logger.info("search page HTTP %s — stop pagination", response.status_code)
                break
            if response.status_code == 403:
                self.logger.error("HTTP 403 on search HTML — blocked (try different IP or REALETHIO_SEARCH_URL).")
                response.raise_for_status()
            if not response.ok:
                if len(urls) > 0 and not strict:
                    self.logger.warning(
                        "Search pagination HTTP %s after retries — using %s URLs collected so far (set REALETHIO_STRICT_DISCOVERY=true to fail instead).",
                        response.status_code,
                        len(urls),
                    )
                    break
                response.raise_for_status()

            batch = self._extract_property_urls_from_html(response.text)
            added = 0
            for u in batch:
                if u not in seen:
                    seen.add(u)
                    urls.append(u)
                    added += 1

            self.logger.info("discovery page=%s +%s listings (total=%s)", page, added, len(urls))

            if page == 1 and not urls and not batch:
                raise RuntimeError(
                    "No property links on Addis Ababa search page. Site layout may have changed or HTML was blocked."
                )

            if page > 1 and added == 0:
                self.logger.info("no new listings on page %s — end of results", page)
                break

            if self.limit and len(urls) >= self.limit:
                return urls[: self.limit]
            if self.test_mode and len(urls) >= 3:
                return urls[:3]

            page += 1
            time.sleep(extra_sleep + random.uniform(SCRAPER_SLEEP_MIN, SCRAPER_SLEEP_MAX))

        return urls

    def _normalize_property(self, extracted: Dict[str, Any], detail_url: str) -> Dict[str, Any]:
        images = [u.strip() for u in (extracted.get("images") or []) if isinstance(u, str) and u.strip()]
        maps_url = clean_text(extracted.get("google_maps_url"))
        lat, lng = parse_lat_lng_from_url(maps_url)

        property_id = clean_text(extracted.get("property_id")) or self._fallback_property_id_from_url(detail_url)
        price_num = parse_number(str(extracted.get("price") or ""))

        return {
            "property_id": property_id,
            "source_website": self.source_website,
            "source_name": self.source_name,
            "detail_url": detail_url,
            "title": clean_text(extracted.get("title")) or f"Listing {property_id}",
            "price": price_num,
            "currency": clean_text(extracted.get("currency")) or "ETB",
            "property_size_m2": extracted.get("property_size_m2"),
            "land_area_m2": extracted.get("land_area_m2"),
            "bedrooms": extracted.get("bedrooms"),
            "bathrooms": extracted.get("bathrooms"),
            "garage": extracted.get("garage"),
            "property_type": clean_text(extracted.get("property_type")),
            "property_status": clean_text(extracted.get("property_status")),
            "floor": None,
            "furnished": bool(extracted.get("furnished")) if extracted.get("furnished") is not None else False,
            "features": [clean_text(f) for f in (extracted.get("features") or []) if clean_text(f)],
            "images": images,
            "google_maps_url": maps_url,
            "latitude": lat,
            "longitude": lng,
            "location_city": clean_text(extracted.get("location_city")) or "Addis Ababa",
            "location_area": clean_text(extracted.get("location_area")),
            "location_district": clean_text(extracted.get("location_district")),
            "description": clean_text(extracted.get("description")),
            "source_listing_updated": clean_text(extracted.get("source_listing_updated")),
            "is_scraped": True,
            "created_at": datetime.utcnow().isoformat(),
        }

    async def _extract_listing(self, crawler: AsyncWebCrawler, url: str) -> Optional[Dict[str, Any]]:
        async with self._sem:
            if self._detail_sleep_sec > 0:
                await asyncio.sleep(self._detail_sleep_sec + random.uniform(0, 0.8))

            strategy = LLMExtractionStrategy(
                llm_config=LLMConfig(provider=self._llm_provider, api_token=self._llm_token),
                schema=self._schema,
                extraction_type="schema",
                input_format="markdown",
                instruction=(
                    "Extract one Addis Ababa property listing. Return exactly one JSON object matching the schema. "
                    "Capture all available gallery image URLs from the page. Keep numeric fields numeric where possible."
                ),
            )
            config = CrawlerRunConfig(
                extraction_strategy=strategy,
                cache_mode=CacheMode.BYPASS,
                word_count_threshold=1,
            )

            last_exc: Optional[Exception] = None
            for attempt in range(self._detail_max_retries + 1):
                try:
                    result = await crawler.arun(url=url, config=config)
                    if not result or not getattr(result, "extracted_content", None):
                        self.logger.warning("No extracted content for %s", url)
                        return None

                    raw = result.extracted_content
                    try:
                        parsed = json.loads(raw)
                    except json.JSONDecodeError:
                        self.logger.warning("Invalid JSON for %s", url)
                        return None

                    obj = parsed[0] if isinstance(parsed, list) and parsed else parsed
                    if not isinstance(obj, dict):
                        self.logger.warning("Unexpected schema output for %s", url)
                        return None

                    # Backfill image urls from crawler media if LLM omitted some.
                    media_images = []
                    media = getattr(result, "media", None)
                    if isinstance(media, dict):
                        for img in media.get("images", []) or []:
                            src = img.get("src") if isinstance(img, dict) else None
                            if src:
                                media_images.append(src)
                    if media_images:
                        obj["images"] = list(dict.fromkeys((obj.get("images") or []) + media_images))

                    return self._normalize_property(obj, url)
                except Exception as exc:
                    last_exc = exc
                    if attempt < self._detail_max_retries:
                        wait = min(45.0, self._detail_retry_base_sec * (2 ** attempt)) + random.uniform(1, 4)
                        self.logger.warning(
                            "detail extraction retry %s/%s in %.1fs for %s (%s)",
                            attempt + 1,
                            self._detail_max_retries,
                            wait,
                            url,
                            exc,
                        )
                        await asyncio.sleep(wait)
                    else:
                        self.logger.warning("listing extraction failed after retries for %s: %s", url, last_exc)
                        return None
            return None

    async def scrape_async(self) -> List[Dict[str, Any]]:
        if not self._llm_token:
            raise RuntimeError("OPENAI_API_KEY or LLM_API_TOKEN is required for crawl4ai LLM extraction.")

        urls = self._discover_listing_urls()
        self.logger.info("Discovered %s detail URLs", len(urls))
        if not urls:
            return []

        browser_config = BrowserConfig(headless=True, verbose=False)
        properties: List[Dict[str, Any]] = []
        batch_size = max(1, self._batch_size)
        total = len(urls)
        for start in range(0, total, batch_size):
            chunk = urls[start : start + batch_size]
            self.logger.info(
                "extract batch %s-%s/%s (size=%s)",
                start + 1,
                min(start + len(chunk), total),
                total,
                len(chunk),
            )
            # Recreate crawler per batch to release browser/page memory aggressively.
            async with AsyncWebCrawler(config=browser_config) as crawler:
                rows = await asyncio.gather(
                    *[self._extract_listing(crawler, url) for url in chunk],
                    return_exceptions=True,
                )
            for row in rows:
                if isinstance(row, Exception):
                    self.logger.warning("listing extraction error: %s", row)
                    continue
                if row:
                    properties.append(row)

        self.logger.info("Extracted %s/%s listings", len(properties), len(urls))
        return properties

    def scrape(self) -> List[Dict[str, Any]]:
        return asyncio.run(self.scrape_async())
