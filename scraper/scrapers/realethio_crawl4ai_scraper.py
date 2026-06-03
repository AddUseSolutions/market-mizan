import asyncio
import gc
import hashlib
import json
import logging
import os
import random
import re
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse

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
from utils.db import normalize_detail_url
from utils.helpers import clean_text, parse_lat_lng_from_url, parse_number
from utils.listing_content import limit_images, summarize_description

SITE_SPECS: Dict[str, Dict[str, Any]] = {
    "realethio": {
        "source_website": "realethio.com",
        "source_name": "RealEthio",
        "bare_host": "realethio.com",
        "sitemap_env": "REALETHIO_SITEMAP_URLS",
        "default_sitemaps": [
            "https://realethio.com/property-sitemap.xml",
            "https://realethio.com/property-sitemap2.xml",
        ],
    },
    "ethiopiarealty": {
        "source_website": "ethiopiarealty.com",
        "source_name": "EthiopiaRealty",
        "bare_host": "ethiopiarealty.com",
        "sitemap_env": "ETHIOPIAREALTY_SITEMAP_URLS",
        "default_sitemaps": [
            "https://ethiopiarealty.com/property-sitemap.xml",
            "https://ethiopiarealty.com/property-sitemap2.xml",
        ],
    },
}

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
    floor: Optional[int] = Field(default=None, description="Floor number if available.")
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


@dataclass
class ListingExtractionError(Exception):
    url: str
    error_type: str
    message: str

    def __str__(self) -> str:
        return f"{self.error_type}: {self.url} ({self.message})"


class RealEthioScraper:
    def __init__(
        self,
        site: str = "realethio",
        test_mode: bool = False,
        limit: Optional[int] = None,
    ):
        if site not in SITE_SPECS:
            raise ValueError(f"unknown site {site!r}; expected one of {tuple(SITE_SPECS)}")
        spec = SITE_SPECS[site]
        self._site_key = site
        self.source_website = spec["source_website"]
        self.source_name = spec["source_name"]
        self._bare_host = spec["bare_host"]
        self._origin = f"https://{self._bare_host}"
        self._origin_slash = f"{self._origin}/"
        self._sitemap_env = spec["sitemap_env"]
        self._default_sitemaps = list(spec["default_sitemaps"])
        self.test_mode = test_mode
        self.limit = limit
        self.logger = logging.getLogger(f"{self.__class__.__name__}.{site}")
        # Lower default concurrency on small hosts (Playwright is heavy per tab).
        self._sem = asyncio.Semaphore(int(os.getenv("SCRAPER_CONCURRENCY", "2")))
        # Keep batches tiny by default on Render cron instances to avoid OOM.
        self._batch_size = int(os.getenv("SCRAPER_BATCH_SIZE", "1"))
        self._batch_cooldown_sec = float(os.getenv("SCRAPER_BATCH_COOLDOWN_SEC", "2"))
        self._browser_restart_retries = int(os.getenv("SCRAPER_BROWSER_RESTART_RETRIES", "2"))
        self._detail_max_retries = int(os.getenv("REALETHIO_DETAIL_MAX_RETRIES", "2"))
        self._detail_retry_base_sec = float(os.getenv("REALETHIO_DETAIL_RETRY_BASE_SEC", "4"))
        self._detail_sleep_sec = float(os.getenv("REALETHIO_DETAIL_SLEEP_SEC", "0.5"))
        self._detail_css_selector = (os.getenv("REALETHIO_DETAIL_CSS_SELECTOR") or "").strip() or None
        self._llm_provider = os.getenv("CRAWL4AI_LLM_PROVIDER", "openai/gpt-4o-mini")
        self._llm_token = os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_TOKEN")
        self._discovery_query_pairs: Optional[List[tuple]] = None
        override = (os.getenv("REALETHIO_SEARCH_URL") or "").strip()
        if self._site_key == "realethio" and override:
            try:
                self._discovery_query_pairs = self._parse_search_url_to_query_pairs(override)
                self.logger.info(
                    "Using REALETHIO_SEARCH_URL query for all pagination pages (%s params)",
                    len(self._discovery_query_pairs),
                )
            except ValueError as exc:
                self.logger.warning("Invalid REALETHIO_SEARCH_URL (%s) — falling back to default Addis query.", exc)
        self._schema = (
            PropertySchema.model_json_schema()
            if hasattr(PropertySchema, "model_json_schema")
            else PropertySchema.schema()
        )

    def _fallback_property_id_from_url(self, url: str) -> str:
        h = hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]
        prefix = "ER" if self._site_key == "ethiopiarealty" else "RE"
        return f"{prefix}{int(h, 16) % 1000000}"

    def _normalize_property_href(self, href: str) -> str:
        u = (href or "").strip()
        if not u:
            return ""
        u = u.split("#")[0].strip()
        full = urljoin(self._origin_slash, u)
        n = normalize_detail_url(full)
        if not n or not n.startswith(f"https://{self.source_website}"):
            return ""
        return n

    def _is_property_detail_url(self, url: str) -> bool:
        try:
            u = (url or "").strip()
            if not u:
                return False
            u = u.split("#")[0].strip()
            if not u.startswith(("http://", "https://")):
                u = urljoin(self._origin_slash, u)
            n = normalize_detail_url(u)
            if not n or not n.startswith(f"https://{self.source_website}"):
                return False
            p = urlparse(n)
            parts = [x for x in p.path.strip("/").split("/") if x]
            return len(parts) >= 2 and parts[0] == "property"
        except Exception:
            return False

    @staticmethod
    def _parse_search_url_to_query_pairs(url: str) -> List[tuple]:
        """Use the query string from REALETHIO_SEARCH_URL for every paginated discovery request."""
        parsed = urlparse(url.strip())
        host = (parsed.netloc or "").lower()
        if host.startswith("www."):
            host = host[4:]
        if host != "realethio.com":
            raise ValueError(f"expected host realethio.com, got {parsed.netloc!r}")
        path = (parsed.path or "").lower()
        if "search-results" not in path:
            raise ValueError("path must include search-results")
        pairs = parse_qsl(parsed.query, keep_blank_values=True)
        if not pairs:
            return list(_DEFAULT_ADDIS_QUERY)
        return pairs

    def _search_results_url(self, page: int) -> str:
        """Houzez-style pagination: /search-results/ and /search-results/page/N/."""
        pairs = self._discovery_query_pairs if self._discovery_query_pairs is not None else _DEFAULT_ADDIS_QUERY
        q = urlencode(pairs, doseq=True)
        if page <= 1:
            return f"https://realethio.com/search-results/?{q}"
        return f"https://realethio.com/search-results/page/{page}/?{q}"

    def _extract_property_urls_from_html(self, html: str) -> List[str]:
        found: List[str] = []
        seen_path = set()
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.select("a[href]"):
            href = a.get("href") or ""
            full = urljoin(self._origin_slash, href)
            norm = self._normalize_property_href(full)
            if self._is_property_detail_url(norm):
                key = urlparse(norm).path.rstrip("/")
                if key and key not in seen_path:
                    seen_path.add(key)
                    found.append(norm)

        host_pat = re.escape(self._bare_host)
        for m in re.finditer(
            rf'https?://(?:www\.)?{host_pat}/property/[^\s"\'<>]+',
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

    def _merge_discovered_urls(self, *lists: List[str]) -> List[str]:
        seen = set()
        out: List[str] = []
        for lst in lists:
            for u in lst:
                n = self._normalize_property_href(u)
                if not n or n in seen:
                    continue
                seen.add(n)
                out.append(n)
        return out

    def _discover_listing_urls_sitemap(self) -> List[str]:
        """
        Alle Property-URLs aus den XML-Sitemaps (schnell, ohne Pagination).
        URLs: REALETHIO_SITEMAP_URLS bzw. ETHIOPIAREALTY_SITEMAP_URLS (kommagetrennt), sonst Defaults pro Site.
        """
        raw = (os.getenv(self._sitemap_env) or "").strip()
        if raw:
            sitemap_urls = [u.strip() for u in raw.split(",") if u.strip()]
        else:
            sitemap_urls = list(self._default_sitemaps)

        session = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "linux", "mobile": False}
        )
        session.headers.update(
            {
                "Accept": "application/xml,text/xml,*/*;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": self._origin_slash,
            }
        )

        collected: List[str] = []
        seen = set()
        for sm_url in sitemap_urls:
            self.logger.info("sitemap fetch %s", sm_url)
            response = self._fetch_search_page(session, sm_url)
            if not response.ok:
                self.logger.error("sitemap HTTP %s %s", response.status_code, sm_url)
                response.raise_for_status()
            for m in re.finditer(r"<loc>\s*([^<\s]+)\s*</loc>", response.text, re.I):
                loc = (m.group(1) or "").strip()
                norm = self._normalize_property_href(loc)
                if not self._is_property_detail_url(norm):
                    continue
                if norm not in seen:
                    seen.add(norm)
                    collected.append(norm)

        self.logger.info("sitemap discovery total=%s unique property URLs", len(collected))

        if not collected:
            raise RuntimeError("Sitemap: keine Property-URLs gefunden (Layout geändert oder blockiert).")

        if self.limit:
            return collected[: self.limit]
        if self.test_mode:
            return collected[:3]
        return collected

    def _discover_listing_urls_search(self) -> List[str]:
        """
        Listings only for Addis Ababa via the site's search-results HTML (location=addis-ababa).
        Avoids /wp-json/ which often returns 403 on server IPs.
        """
        max_pages = int(os.getenv("REALETHIO_MAX_SEARCH_PAGES", "200"))

        session = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "linux", "mobile": False}
        )
        session.headers.update(
            {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": self._origin_slash,
            }
        )

        urls: List[str] = []
        seen = set()
        page = 1
        strict = (os.getenv("REALETHIO_STRICT_DISCOVERY", "").lower() in ("1", "true", "yes"))
        extra_sleep = float(os.getenv("REALETHIO_PAGINATION_EXTRA_SLEEP_SEC", "5"))

        while page <= max_pages:
            url = self._search_results_url(page)
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

    def _discover_listing_urls(self) -> List[str]:
        """
        Phase 1: URL-Inventar ohne LLM.
        REALETHIO_DISCOVERY_MODE: sitemap (Default) | search | both
        (nur realethio.com; ethiopiarealty.com immer per Sitemap)
        """
        if self._site_key == "ethiopiarealty":
            return self._discover_listing_urls_sitemap()
        mode = (os.getenv("REALETHIO_DISCOVERY_MODE") or "sitemap").strip().lower()
        if mode == "search":
            return self._discover_listing_urls_search()
        if mode == "both":
            return self._merge_discovered_urls(
                self._discover_listing_urls_sitemap(),
                self._discover_listing_urls_search(),
            )
        return self._discover_listing_urls_sitemap()

    def discover_listing_urls(self) -> List[str]:
        """Phase 1: Discovery ohne LLM / Crawl4ai (siehe REALETHIO_DISCOVERY_MODE)."""
        return self._discover_listing_urls()

    def _normalize_property(self, extracted: Dict[str, Any], detail_url: str) -> Dict[str, Any]:
        images = limit_images(
            [u.strip() for u in (extracted.get("images") or []) if isinstance(u, str) and u.strip()]
        )
        maps_url = clean_text(extracted.get("google_maps_url"))
        lat = extracted.get("latitude")
        lng = extracted.get("longitude")
        if lat is None or lng is None:
            lat, lng = parse_lat_lng_from_url(maps_url)

        property_id = clean_text(extracted.get("property_id")) or self._fallback_property_id_from_url(detail_url)
        price_num = parse_number(str(extracted.get("price") or ""))

        fact_data = {
            "property_status": clean_text(extracted.get("property_status")),
            "property_type": clean_text(extracted.get("property_type")),
            "location_area": clean_text(extracted.get("location_area")),
            "location_district": clean_text(extracted.get("location_district")),
            "bedrooms": extracted.get("bedrooms"),
            "bathrooms": extracted.get("bathrooms"),
            "property_size_m2": extracted.get("property_size_m2"),
            "land_area_m2": extracted.get("land_area_m2"),
            "furnished": extracted.get("furnished"),
            "features": extracted.get("features") or [],
        }
        description = summarize_description(fact_data, extracted.get("description"))

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
            "floor": extracted.get("floor"),
            "furnished": bool(extracted.get("furnished")) if extracted.get("furnished") is not None else False,
            "features": [clean_text(f) for f in (extracted.get("features") or []) if clean_text(f)],
            "images": images,
            "google_maps_url": maps_url,
            "latitude": lat,
            "longitude": lng,
            "location_city": clean_text(extracted.get("location_city")) or "Addis Ababa",
            "location_area": clean_text(extracted.get("location_area")),
            "location_district": clean_text(extracted.get("location_district")),
            "description": description,
            "source_listing_updated": clean_text(extracted.get("source_listing_updated")),
            "is_scraped": True,
            "created_at": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def _extract_meta_value(soup: BeautifulSoup, label: str) -> Optional[str]:
        label_low = label.lower()
        for row in soup.select("li, .property-meta > div, tr"):
            text = clean_text(row.get_text(" ", strip=True) or "")
            if label_low not in text.lower():
                continue
            if ":" in text:
                parts = text.split(":")
                if len(parts) > 1:
                    return clean_text(parts[-1])
            idx = text.lower().find(label_low)
            if idx >= 0:
                rest = text[idx + len(label) :].strip()
                rest = re.sub(r"^[:\s\-–]+", "", rest)
                if rest:
                    return clean_text(rest)
        return None

    @staticmethod
    def _extract_listing_updated_text(soup: BeautifulSoup, raw_text: str) -> Optional[str]:
        wrap = soup.select_one("#property-detail-wrap")
        if wrap:
            for sel in (".block-title-wrap span", ".block-title-wrap > span"):
                hit = wrap.select_one(sel)
                if hit:
                    t = clean_text(hit.get_text(" ", strip=True))
                    if t and "updated" in t.lower():
                        return t
            for span in wrap.find_all("span"):
                t = clean_text(span.get_text(" ", strip=True))
                if t and "updated on" in t.lower():
                    return t
        for pattern in (
            r"Updated on\s+.+?(?:a\.m\.|p\.m\.|am|pm)\b",
            r"Updated on\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}",
        ):
            match = re.search(pattern, raw_text, re.IGNORECASE | re.DOTALL)
            if match:
                return clean_text(match.group(0))
        return None

    @staticmethod
    def _extract_floor(soup: BeautifulSoup, raw_text: str) -> Optional[int]:
        raw = RealEthioScraper._extract_meta_value(soup, "Floor")
        if raw:
            num = parse_number(raw)
            if num is not None:
                return int(num)
        m = re.search(r"floor[:\s]+(\d+)", raw_text, re.IGNORECASE)
        if m:
            return int(m.group(1))
        return None

    @staticmethod
    def _extract_maps_url(soup: BeautifulSoup) -> Optional[str]:
        iframe = soup.select_one("iframe[src*='google.com/maps']")
        if iframe and iframe.get("src"):
            return iframe.get("src")
        link = soup.select_one("a[href*='google.com/maps'], a[href*='maps.google.'], a[href*='goo.gl/maps']")
        return link.get("href") if link else None

    @staticmethod
    def _extract_lat_lng(soup: BeautifulSoup, maps_url: Optional[str], raw_text: str) -> tuple[Optional[float], Optional[float]]:
        lat, lng = parse_lat_lng_from_url(maps_url)
        if lat is not None and lng is not None:
            return lat, lng

        def to_float(value: Any) -> Optional[float]:
            try:
                if value is None:
                    return None
                return float(str(value).strip())
            except Exception:
                return None

        lat_input = soup.select_one(
            "input[name='houzez_geolocation_lat'], input#houzez_geolocation_lat, input[name='lat'], input[name='latitude']"
        )
        lng_input = soup.select_one(
            "input[name='houzez_geolocation_long'], input#houzez_geolocation_long, input[name='lng'], input[name='longitude']"
        )
        lat_val = to_float(lat_input.get("value")) if lat_input else None
        lng_val = to_float(lng_input.get("value")) if lng_input else None
        if lat_val is not None and lng_val is not None:
            return lat_val, lng_val

        patterns = [
            r"houzez_geolocation_lat[^0-9-]*(-?\d{1,2}\.\d+).*?houzez_geolocation_(?:long|lng)[^0-9-]*(-?\d{1,3}\.\d+)",
            r"L\.marker\(\s*\[\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*\]",
            r"setView\(\s*\[\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*\]",
            r"center\s*:\s*\[\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*\]",
        ]
        for pattern in patterns:
            m = re.search(pattern, raw_text, re.IGNORECASE | re.DOTALL)
            if m:
                a = to_float(m.group(1))
                b = to_float(m.group(2))
                if a is not None and b is not None:
                    return a, b

        return None, None

    @staticmethod
    def _normalize_image_key(url: str) -> str:
        return re.sub(r"-\d+x\d+(?=\.[a-zA-Z]{3,4}($|\?))", "", url)

    def _extract_gallery_images(self, soup: BeautifulSoup) -> List[str]:
        urls: List[str] = []
        seen = set()

        def add(src: Optional[str]):
            if not src:
                return
            full = urljoin(self._origin, src.strip())
            if "/wp-content/" not in full:
                return
            if not re.search(r"\.(jpe?g|png|webp)(\?|$)", full, re.IGNORECASE):
                return
            if re.search(r"logo|avatar|icon|favicon", full, re.IGNORECASE):
                return
            key = self._normalize_image_key(full)
            if key in seen:
                return
            seen.add(key)
            urls.append(full)

        # Prefer explicit gallery anchors (usually original-sized images).
        for a in soup.select(
            ".property-gallery a[href], .gallery a[href], .listing-gallery a[href], .swiper-slide a[href]"
        ):
            add(a.get("href"))

        # Then fallback to gallery img attributes.
        for img in soup.select(".property-gallery img, .gallery img, .listing-gallery img, .swiper-slide img"):
            for key in ("data-large_image", "data-original", "data-src", "data-lazy-src", "src"):
                add(img.get(key))
            srcset = img.get("srcset") or img.get("data-srcset")
            if srcset:
                for item in srcset.split(","):
                    piece = item.strip().split(" ")[0]
                    add(piece)

        return urls[:60]

    @staticmethod
    def _looks_like_not_found(raw_text: str) -> bool:
        t = (raw_text or "").strip().lower()
        if not t:
            return False
        needles = (
            "page not found",
            "oh oh! page not found",
            "we're sorry the page you are looking for doesn't exist",
            "we are sorry the page you are looking for doesn't exist",
            "404",
        )
        return any(n in t for n in needles)

    async def _extract_listing(self, crawler: AsyncWebCrawler, url: str) -> Optional[Dict[str, Any]]:
        async with self._sem:
            if self._detail_sleep_sec > 0:
                await asyncio.sleep(self._detail_sleep_sec + random.uniform(0, 0.8))

            loc_hint = (
                "Ethiopia property listing"
                if self._site_key == "ethiopiarealty"
                else "Addis Ababa property listing"
            )
            strategy = LLMExtractionStrategy(
                llm_config=LLMConfig(provider=self._llm_provider, api_token=self._llm_token),
                schema=self._schema,
                extraction_type="schema",
                input_format="markdown",
                instruction=(
                    f"Extract one {loc_hint}. Return exactly one JSON object matching the schema. "
                    "Capture up to six gallery image URLs (living room, bedroom, bathroom, kitchen, facade, garden). "
                    "Do not copy marketing text for description — leave description empty or one factual sentence only. "
                    "Keep numeric fields numeric where possible."
                ),
            )
            run_kw: Dict[str, Any] = dict(
                extraction_strategy=strategy,
                cache_mode=CacheMode.BYPASS,
                word_count_threshold=1,
            )
            if self._detail_css_selector:
                run_kw["css_selector"] = self._detail_css_selector
            try:
                config = CrawlerRunConfig(**run_kw)
            except TypeError:
                run_kw.pop("css_selector", None)
                config = CrawlerRunConfig(**run_kw)

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

                    page_html = (
                        getattr(result, "html", None)
                        or getattr(result, "cleaned_html", None)
                        or getattr(result, "fit_html", None)
                    )
                    if isinstance(page_html, str) and page_html.strip():
                        soup = BeautifulSoup(page_html, "html.parser")
                        raw_text = soup.get_text(" ", strip=True)
                        if self._looks_like_not_found(raw_text):
                            raise ListingExtractionError(
                                url=url,
                                error_type="not_found",
                                message="detail page looks like 404/not-found template",
                            )

                        # Keep only listing gallery images to avoid extra site images.
                        gallery_images = self._extract_gallery_images(soup)
                        if gallery_images:
                            obj["images"] = gallery_images

                        if not clean_text(obj.get("source_listing_updated")):
                            obj["source_listing_updated"] = self._extract_listing_updated_text(soup, raw_text)

                        if obj.get("floor") is None:
                            obj["floor"] = self._extract_floor(soup, raw_text)

                        if not clean_text(obj.get("google_maps_url")):
                            obj["google_maps_url"] = self._extract_maps_url(soup)

                        maps_url = clean_text(obj.get("google_maps_url"))
                        lat, lng = self._extract_lat_lng(soup, maps_url, raw_text)
                        if lat is not None and lng is not None:
                            obj["latitude"] = lat
                            obj["longitude"] = lng

                    return self._normalize_property(obj, url)
                except ListingExtractionError:
                    raise
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
                        raise ListingExtractionError(url=url, error_type="extract_failed", message=str(last_exc))
            raise ListingExtractionError(url=url, error_type="extract_failed", message=str(last_exc or "unknown"))

    async def scrape_async(self) -> List[Dict[str, Any]]:
        items: List[Dict[str, Any]] = []

        def _collect(row: Dict[str, Any], _idx: int, _total: int):
            items.append(row)

        urls = self._discover_listing_urls()
        await self.scrape_stream_async_for_urls(urls, on_property=_collect)
        return items

    @staticmethod
    def _is_browser_crash_error(exc: Exception) -> bool:
        msg = str(exc or "").lower()
        needles = (
            "browsertype.launch",
            "target page, context or browser has been closed",
            "browser has been closed",
            "sigsegv",
            "received signal 11",
        )
        return any(n in msg for n in needles)

    async def scrape_stream_async_for_urls(
        self,
        urls: List[str],
        on_property: Optional[Callable[[Dict[str, Any], int, int], None]] = None,
        on_failure: Optional[Callable[[str, str, str], None]] = None,
    ) -> Dict[str, int]:
        """Phase 3: LLM detail extraction only for the given URL list."""
        if not self._llm_token:
            raise RuntimeError("OPENAI_API_KEY or LLM_API_TOKEN is required for crawl4ai LLM extraction.")

        if not urls:
            return {"discovered": 0, "extracted": 0}

        self.logger.info("Detail scrape for %s URLs", len(urls))
        browser_config = self._browser_config()
        extracted = 0
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
            rows: List[Any] = []
            for attempt in range(self._browser_restart_retries + 1):
                try:
                    async with AsyncWebCrawler(config=browser_config) as crawler:
                        rows = await asyncio.gather(
                            *[self._extract_listing(crawler, url) for url in chunk],
                            return_exceptions=True,
                        )
                    break
                except Exception as exc:
                    crash = self._is_browser_crash_error(exc)
                    if crash and attempt < self._browser_restart_retries:
                        wait = min(20.0, (2 ** attempt) + random.uniform(0.5, 2.0))
                        self.logger.warning(
                            "browser crash on batch %s-%s/%s, restarting crawler in %.1fs (%s/%s): %s",
                            start + 1,
                            min(start + len(chunk), total),
                            total,
                            wait,
                            attempt + 1,
                            self._browser_restart_retries,
                            exc,
                        )
                        await asyncio.sleep(wait)
                        gc.collect()
                        continue
                    self.logger.exception(
                        "batch %s-%s/%s failed and will be skipped: %s",
                        start + 1,
                        min(start + len(chunk), total),
                        total,
                        exc,
                    )
                    rows = []
                    break
            for row in rows:
                if isinstance(row, ListingExtractionError):
                    self.logger.warning("listing extraction error: %s", row)
                    if on_failure:
                        on_failure(row.url, row.error_type, row.message)
                    continue
                if isinstance(row, Exception):
                    self.logger.warning("listing extraction error: %s", row)
                    if on_failure:
                        on_failure("", "extract_failed", str(row))
                    continue
                if row:
                    extracted += 1
                    if on_property:
                        on_property(row, extracted, total)
            if self._batch_cooldown_sec > 0 and start + batch_size < total:
                await asyncio.sleep(self._batch_cooldown_sec)
            gc.collect()

        self.logger.info("Extracted %s/%s listings", extracted, len(urls))
        return {"discovered": total, "extracted": extracted}

    async def scrape_stream_async(
        self,
        on_property: Optional[Callable[[Dict[str, Any], int, int], None]] = None,
    ) -> Dict[str, int]:
        """Discover all listing URLs, then run LLM extraction on every URL (no DB skip)."""
        urls = self._discover_listing_urls()
        self.logger.info("Discovered %s detail URLs (full scrape, no freshness skip)", len(urls))
        return await self.scrape_stream_async_for_urls(urls, on_property=on_property)

    def scrape_stream_for_urls(
        self,
        urls: List[str],
        on_property: Optional[Callable[[Dict[str, Any], int, int], None]] = None,
        on_failure: Optional[Callable[[str, str, str], None]] = None,
    ) -> Dict[str, int]:
        return asyncio.run(self.scrape_stream_async_for_urls(urls, on_property=on_property, on_failure=on_failure))

    def scrape_stream(self, on_property: Optional[Callable[[Dict[str, Any], int, int], None]] = None) -> Dict[str, int]:
        return asyncio.run(self.scrape_stream_async(on_property=on_property))
    
    def _browser_config(self) -> BrowserConfig:
        """Tuned for low RAM / shared containers (e.g. Render) — override via env."""
        extra = [
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-extensions",
            "--disable-background-networking",
        ]
        raw = (os.getenv("SCRAPER_CHROMIUM_EXTRA_ARGS") or "").strip()
        if raw:
            extra.extend(part.strip() for part in raw.split(",") if part.strip())

        text_mode = os.getenv("SCRAPER_BROWSER_TEXT_MODE", "").lower() in ("1", "true", "yes")
        light_mode = os.getenv("SCRAPER_BROWSER_LIGHT_MODE", "").lower() in ("1", "true", "yes")
        sleep_on_close = os.getenv("SCRAPER_BROWSER_SLEEP_ON_CLOSE", "true").lower() in ("1", "true", "yes")
        vw = int(os.getenv("SCRAPER_VIEWPORT_WIDTH", "1024"))
        vh = int(os.getenv("SCRAPER_VIEWPORT_HEIGHT", "540"))

        try:
            return BrowserConfig(
                headless=True,
                verbose=False,
                extra_args=extra,
                viewport_width=vw,
                viewport_height=vh,
                text_mode=text_mode,
                light_mode=light_mode,
                sleep_on_close=sleep_on_close,
            )
        except TypeError:
            # Older crawl4ai: skip optional flags.
            self.logger.warning("BrowserConfig: falling back without text_mode/light_mode/sleep_on_close")
            return BrowserConfig(
                headless=True,
                verbose=False,
                extra_args=extra,
                viewport_width=vw,
                viewport_height=vh,
            )

    def scrape(self) -> List[Dict[str, Any]]:
        return asyncio.run(self.scrape_async())
