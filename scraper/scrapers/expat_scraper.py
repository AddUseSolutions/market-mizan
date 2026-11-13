"""
Expat.com Ethiopia housing scraper.
Most ads are long-term rentals; many are furnished (expats / NGOs).
"""
from __future__ import annotations

import hashlib
import json
import logging
import random
import re
import time
from typing import Callable, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import cloudscraper
from bs4 import BeautifulSoup

from utils.canonical_areas import apply_canonical_area
from utils.fx_rate import get_etb_per_usd
from utils.helpers import clean_text, parse_number
from utils.listing_content import clean_original_description, limit_images, summarize_description

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

BASE_URL = "https://www.expat.com"
ETHIOPIA_LIST_URL = "https://www.expat.com/en/housing/africa/ethiopia/"
# The old /39-houses-for-rent/ hubs now 404. Listings sit on these pages,
# often under /ethiopia/<city>/<id>-.../<id>-....html.
ETHIOPIA_CATEGORY_URLS = [
    ETHIOPIA_LIST_URL,
    "https://www.expat.com/en/housing/africa/ethiopia/houses-for-rent.html",
    "https://www.expat.com/en/housing/africa/ethiopia/flats-for-rent.html",
    "https://www.expat.com/en/housing/africa/ethiopia/houses-for-sale.html",
    "https://www.expat.com/en/housing/africa/ethiopia/rooms-for-rent.html",
]
DETAIL_RE = re.compile(
    r"^https://www\.expat\.com/en/housing/africa/ethiopia/(?:[a-z-]+/)?\d+-[^/]+/\d+-[^/?#]+\.html$",
    re.I,
)


def _property_id_from_url(url: str) -> str:
    m = re.search(r"/(\d+)-[^/]+\.html", url)
    if m:
        return f"EX{m.group(1)}"
    h = hashlib.sha256(url.encode("utf-8")).hexdigest()[:10]
    return f"EX{int(h, 16) % 10000000}"


def _looks_furnished(text: str) -> bool:
    t = (text or "").lower()
    if "unfurnished" in t or "un-furnished" in t or "not furnished" in t:
        return False
    return "furnished" in t


def _listing_numeric_id(url: str) -> Optional[str]:
    m = re.search(r"/(\d+)-[^/]+\.html", url or "")
    return m.group(1) if m else None


def _extract_expat_images(soup: BeautifulSoup, page_url: str, html: str) -> List[str]:
    """Prefer JSON-LD / og:image /upload/housing/{id}/ — never sidebar ads or other listings."""
    listing_id = _listing_numeric_id(page_url)
    found: List[str] = []

    def _add(url: str) -> None:
        if not url or not isinstance(url, str):
            return
        src = url.strip().replace("\\/", "/")
        if src.startswith("//"):
            src = "https:" + src
        elif src.startswith("/"):
            src = urljoin(BASE_URL, src)
        if not src.startswith("http"):
            return
        low = src.lower()
        if any(
            x in low
            for x in (
                "logo",
                "icon",
                "avatar",
                "sprite",
                "pixel",
                "/guides/",
                "/marketplace/",
                "location-header",
                "favico",
                "business_directory",
                "company_logo",
            )
        ):
            return
        # Only keep this listing's housing uploads when we know the id.
        if listing_id:
            if f"/upload/housing/{listing_id}/" not in low:
                # Allow rare non-upload fallbacks only if no housing path yet.
                if "/upload/housing/" in low:
                    return
                if found and any(f"/upload/housing/{listing_id}/" in u.lower() for u in found):
                    return
        if src not in found:
            found.append(src)

    # 1) schema.org RealEstateListing.image (full gallery on detail pages)
    for script in soup.select('script[type="application/ld+json"]'):
        raw = script.string or script.get_text() or ""
        if not raw.strip():
            continue
        try:
            data = json.loads(raw)
        except Exception:
            continue
        nodes = data if isinstance(data, list) else [data]
        for node in nodes:
            if not isinstance(node, dict):
                continue
            images = node.get("image") or node.get("photo")
            if isinstance(images, str):
                images = [images]
            if not isinstance(images, list):
                continue
            for img in images:
                if isinstance(img, dict):
                    _add(img.get("url") or img.get("contentUrl") or "")
                else:
                    _add(str(img))

    # 2) Open Graph
    for prop in ("og:image", "og:image:url", "twitter:image"):
        tag = soup.find("meta", attrs={"property": prop}) or soup.find("meta", attrs={"name": prop})
        if tag and tag.get("content"):
            _add(tag["content"])

    # 3) Explicit housing uploads for this listing id (HTML / escaped JSON)
    img_ext = r"(?:jpe?g|png|webp|gif)"
    if listing_id:
        for m in re.findall(
            rf"https?:\\?/\\?/[^\"'\\s<>]*?/upload/housing/{re.escape(listing_id)}/[^\"'\\s<>]+\.{img_ext}",
            html or "",
            flags=re.I,
        ):
            _add(m)
        for m in re.findall(
            rf"/upload/housing/{re.escape(listing_id)}/[^\"'\\s<>]+\.{img_ext}",
            html or "",
            flags=re.I,
        ):
            _add(urljoin(BASE_URL, m))

    # 4) Last resort: img tags that already point at this listing's uploads
    if listing_id and not found:
        for img in soup.select("img"):
            for attr in ("src", "data-src", "data-lazy", "data-original"):
                _add(img.get(attr) or "")

    return limit_images(found)


class ExpatComScraper:
    source_website = "expat.com"
    source_name = "Expat.com"

    def __init__(self, test_mode: bool = False, limit: Optional[int] = None, site: str = "expat"):
        self.test_mode = test_mode
        self.limit = limit
        self.logger = logging.getLogger(self.__class__.__name__)
        self.scraper = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "windows", "mobile": False}
        )
        self.last_request_time = 0.0

    def _headers(self) -> Dict[str, str]:
        return {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": ETHIOPIA_LIST_URL,
        }

    def _rate_limit(self):
        elapsed = time.time() - self.last_request_time
        wait = 2.5 - elapsed
        if wait > 0:
            time.sleep(wait)

    def _get(self, url: str) -> Optional[str]:
        self._rate_limit()
        try:
            response = self.scraper.get(url, headers=self._headers(), timeout=45)
            self.last_request_time = time.time()
            if response.status_code >= 400:
                self.logger.warning("HTTP %s for %s", response.status_code, url)
                return None
            return response.text
        except Exception as exc:
            self.logger.warning("Fetch failed %s: %s", url, exc)
            self.last_request_time = time.time()
            return None

    def discover_listing_urls(self) -> List[str]:
        found: List[str] = []
        seen = set()
        max_pages = 12 if not self.test_mode else 1
        for base in ETHIOPIA_CATEGORY_URLS:
            for page in range(1, max_pages + 1):
                if page == 1:
                    url = base
                elif base.endswith("/"):
                    url = f"{base}{page}/"
                else:
                    # Category .html pages are a single list; only the hub is paged.
                    break
                html = self._get(url)
                if not html:
                    break
                if "Page not found" in html:
                    self.logger.info("expat.com skip missing category %s", base)
                    break
                soup = BeautifulSoup(html, "html.parser")
                page_added = 0
                for a in soup.select("a[href]"):
                    href = urljoin(BASE_URL, a.get("href") or "")
                    href = href.split("#")[0].split("?")[0]
                    if not DETAIL_RE.match(href):
                        continue
                    if href in seen:
                        continue
                    seen.add(href)
                    found.append(href)
                    page_added += 1
                    if self.limit and len(found) >= self.limit:
                        return found
                self.logger.info(
                    "expat.com list %s page=%s +%s (total=%s)", base.rstrip("/").split("/")[-1], page, page_added, len(found)
                )
                if page_added == 0:
                    break
                time.sleep(random.uniform(1.0, 2.0))
        return found

    def _parse_price(self, text: str) -> Dict[str, Optional[float]]:
        raw = clean_text(text) or ""
        etb = None
        usd = None
        br = re.search(r"(?:Br|ETB)\s*([\d.,\s]+)", raw, re.I)
        if br:
            etb = parse_number(br.group(1).replace(" ", ""))
        dollar = re.search(r"\$\s*([\d.,]+)", raw)
        if dollar:
            usd = parse_number(dollar.group(1))
        if etb is None and usd is None:
            n = parse_number(raw)
            if n and n >= 500:
                # Expat often lists USD for furnished apartments.
                if n < 20000:
                    usd = n
                else:
                    etb = n
        return {"price_etb": etb, "price_usd": usd}

    def parse_detail(self, url: str, html: str) -> Optional[dict]:
        soup = BeautifulSoup(html, "html.parser")
        title_el = soup.find("h1")
        title = clean_text(title_el.get_text(" ", strip=True) if title_el else "")
        if not title:
            return None

        body_text = clean_text(soup.get_text(" ", strip=True))
        price_text = ""
        for node in soup.find_all(string=re.compile(r"(Br|ETB|\$)\s*[\d]", re.I)):
            price_text = clean_text(str(node))
            if price_text:
                break
        prices = self._parse_price(price_text or body_text[:400])

        bedrooms = None
        bathrooms = None
        size_m2 = None
        for li in soup.select("li"):
            t = clean_text(li.get_text(" ", strip=True)) or ""
            low = t.lower()
            if "bedroom" in low and bedrooms is None:
                bedrooms = parse_number(t)
            elif "bathroom" in low and bathrooms is None:
                bathrooms = parse_number(t)
            elif "(m2)" in low or "m²" in low or "sqm" in low:
                size_m2 = parse_number(t)

        features = []
        for li in soup.select("li"):
            t = clean_text(li.get_text(" ", strip=True))
            if t and 3 < len(t) < 80:
                features.append(t)
        features = list(dict.fromkeys(features))[:24]

        desc_parts = []
        for p in soup.select("p"):
            t = clean_text(p.get_text(" ", strip=True))
            if t and len(t) > 40:
                desc_parts.append(t)
            if len(desc_parts) >= 6:
                break
        description = clean_original_description("\n\n".join(desc_parts))

        images = _extract_expat_images(soup, url, html)

        status = "For Rent"
        path = urlparse(url).path.lower()
        if "for-sale" in path or "sale" in path and "rent" not in path:
            status = "For Sale"
        elif "for-rent" in path or "rent" in path:
            status = "For Rent"

        property_type = "Apartment"
        if "house" in path or "villa" in (title or "").lower():
            property_type = "House"
        elif "flat" in path or "apartment" in (title or "").lower():
            property_type = "Apartment"

        furnished = _looks_furnished(f"{title} {description} {' '.join(features)}")
        etb = prices.get("price_etb")
        usd = prices.get("price_usd")
        rate = get_etb_per_usd()
        if etb and not usd:
            usd = round(float(etb) / rate, 2)
        elif usd and not etb:
            etb = round(float(usd) * rate, 2)

        area_hint = ""
        for token in ("Bole", "Yeka", "Kirkos", "Kazanchis", "Megenagna", "Lideta", "Arada", "Old Airport", "CMC", "Ayat"):
            if token.lower() in f"{title} {description}".lower():
                area_hint = token
                break

        row = {
            "property_id": _property_id_from_url(url),
            "source_website": self.source_website,
            "source_name": self.source_name,
            "detail_url": url,
            "title": title[:255],
            "price": etb,
            "price_etb": etb,
            "price_usd": usd,
            "fx_rate_etb_usd": rate,
            "currency": "ETB" if etb else "USD",
            "property_size_m2": size_m2,
            "land_area_m2": None,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "garage": None,
            "property_type": property_type,
            "property_status": status,
            "floor": None,
            "furnished": furnished,
            "features": features,
            "images": images,
            "google_maps_url": None,
            "latitude": None,
            "longitude": None,
            "location_city": "Addis Ababa",
            "location_area": area_hint or None,
            "location_district": area_hint or None,
            "description_original": description,
            "is_scraped": True,
            "listing_origin": "crawled",
            "verification_status": "unverified",
            "is_paid": False,
            "publisher_type": "unknown",
        }
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
            html = self._get(url)
            if not html:
                if on_failure:
                    on_failure(url, "fetch_error", "empty response")
                continue
            if "Page not found" in html or "404" in (BeautifulSoup(html, "html.parser").title.get_text() if BeautifulSoup(html, "html.parser").title else ""):
                if on_failure:
                    on_failure(url, "not_found", "404")
                continue
            try:
                prop = self.parse_detail(url, html)
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
            time.sleep(random.uniform(1.2, 2.4))
        return {"extracted": extracted}
