import asyncio
import hashlib
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import cloudscraper
from crawl4ai import (
    AsyncWebCrawler,
    BrowserConfig,
    CacheMode,
    CrawlerRunConfig,
    LLMConfig,
    LLMExtractionStrategy,
)
from pydantic import BaseModel, Field

from utils.helpers import clean_text, parse_lat_lng_from_url, parse_number

API_PROPERTIES_URL = "https://realethio.com/wp-json/wp/v2/properties"


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

    def _discover_listing_urls(self) -> List[str]:
        """Use the source WordPress API for exhaustive URL discovery."""
        # Plain requests often get 403 from WAF/Cloudflare; cloudscraper matches browser TLS better.
        session = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "linux", "mobile": False}
        )
        session.headers.update(
            {
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://realethio.com/",
            }
        )

        urls: List[str] = []
        seen = set()
        page = 1
        max_pages = 120

        while page <= max_pages:
            response = session.get(
                API_PROPERTIES_URL,
                params={"per_page": 100, "page": page},
                timeout=50,
            )

            if response.status_code == 400:
                self.logger.info("API pagination end at page=%s", page)
                break
            response.raise_for_status()

            batch = response.json()
            if not batch:
                break

            added = 0
            for item in batch:
                classes = [str(c).lower() for c in item.get("class_list", [])]
                is_addis = "property_city-addis-ababa" in classes or "property_state-addis-ababa" in classes
                if not is_addis:
                    continue

                detail_url = item.get("link")
                if detail_url and detail_url not in seen:
                    seen.add(detail_url)
                    urls.append(detail_url)
                    added += 1

            self.logger.info("discovery page=%s +%s urls (total=%s)", page, added, len(urls))
            if self.limit and len(urls) >= self.limit:
                return urls[: self.limit]
            if self.test_mode and len(urls) >= 3:
                return urls[:3]
            page += 1

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

    async def scrape_async(self) -> List[Dict[str, Any]]:
        if not self._llm_token:
            raise RuntimeError("OPENAI_API_KEY or LLM_API_TOKEN is required for crawl4ai LLM extraction.")

        urls = self._discover_listing_urls()
        self.logger.info("Discovered %s detail URLs", len(urls))
        if not urls:
            return []

        browser_config = BrowserConfig(headless=True, verbose=False)
        async with AsyncWebCrawler(config=browser_config) as crawler:
            tasks = [self._extract_listing(crawler, url) for url in urls]
            rows = await asyncio.gather(*tasks, return_exceptions=True)

        properties: List[Dict[str, Any]] = []
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
