import hashlib
import logging
import random
import re
import time
from datetime import datetime
from dataclasses import dataclass
from typing import List
from urllib.parse import urljoin

import cloudscraper
from bs4 import BeautifulSoup
from fake_useragent import UserAgent

from config import SCRAPER_SLEEP_MAX, SCRAPER_SLEEP_MIN, UPLOAD_DIR
from utils.helpers import clean_text, parse_lat_lng_from_url, parse_number
from utils.image_downloader import download_images

SEARCH_URL = "https://realethio.com/search-results/?type%5B%5D=apartment-for-sale&location%5B%5D=addis-ababa&areas%5B%5D=&bedrooms=&furnished=&bathrooms=&property_id=&min-price=&max-price=&min-area=&max-area="
API_PROPERTIES_URL = "https://realethio.com/wp-json/wp/v2/properties"


def _fallback_property_id_from_url(url: str) -> str:
    """
    Deterministische RE-ID, falls die Seite keine Nummer liefert.
    Python hash() ist pro Prozess zufällig — sonst wechseln IDs zwischen Läufen und Upserts brechen.
    """
    h = hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]
    return f"RE{int(h, 16) % 1000000}"


@dataclass
class ScrapeStats:
    found: int = 0
    new: int = 0
    updated: int = 0


class RealEthioScraper:
    source_website = "realethio.com"
    source_name = "RealEthio"

    def __init__(self, test_mode=False, limit=None):
        self.test_mode = test_mode
        self.limit = limit
        self.logger = logging.getLogger(self.__class__.__name__)
        self.scraper = cloudscraper.create_scraper(browser={"browser": "chrome", "platform": "windows", "mobile": False})
        self.ua = UserAgent()
        self.last_request_time = 0.0
        self.user_agents = self._build_user_agents()
        self.seed_by_url = {}

    def _build_user_agents(self):
        fallback = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        ]
        agents = []
        for _ in range(15):
            try:
                agents.append(self.ua.random)
            except Exception:
                agents.extend(fallback)
                break
        return list(dict.fromkeys(agents + fallback))

    def _rate_limit(self):
        elapsed = time.time() - self.last_request_time
        min_interval = 5
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)

    def _headers(self):
        return {
            "User-Agent": random.choice(self.user_agents),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,am;q=0.8,de;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": "https://www.google.com/",
            "Cache-Control": "no-cache",
            "DNT": "1",
            "Connection": "keep-alive",
        }

    def _request(self, url):
        for attempt in range(4):
            self._rate_limit()
            time.sleep(random.uniform(SCRAPER_SLEEP_MIN, SCRAPER_SLEEP_MAX))
            try:
                response = self.scraper.get(url, headers=self._headers(), timeout=45)
                self.last_request_time = time.time()
                if response.status_code in (403, 429):
                    wait = 30 * (2 ** attempt)
                    self.logger.warning("HTTP %s, warte %ss: %s", response.status_code, wait, url)
                    time.sleep(wait)
                    continue
                response.raise_for_status()
                return response.text
            except Exception as exc:
                self.logger.warning("Request Fehler (%s): %s", url, exc)

        return self._playwright_fallback(url)

    def _request_json(self, url, params=None):
        for attempt in range(4):
            self._rate_limit()
            time.sleep(random.uniform(SCRAPER_SLEEP_MIN, SCRAPER_SLEEP_MAX))
            try:
                response = self.scraper.get(url, headers=self._headers(), params=params, timeout=45)
                self.last_request_time = time.time()
                # WP REST gibt bei "page out of range" einen 400 zurück.
                if response.status_code == 400:
                    self.logger.info("API Pagination beendet bei params=%s (HTTP 400).", params)
                    return "PAGE_OUT_OF_RANGE"
                if response.status_code in (403, 429):
                    wait = 30 * (2 ** attempt)
                    self.logger.warning("API HTTP %s, warte %ss", response.status_code, wait)
                    time.sleep(wait)
                    continue
                response.raise_for_status()
                return response.json()
            except Exception as exc:
                self.logger.warning("API Request Fehler (%s): %s", url, exc)
        return None

    def _extract_listing_urls_from_api(self):
        urls = []
        page = 1
        while page <= 80:
            data = self._request_json(API_PROPERTIES_URL, params={"per_page": 100, "page": page})
            if data == "PAGE_OUT_OF_RANGE":
                self.logger.info("API meldet Ende der Seiten bei Seite %s.", page)
                break
            if not data:
                break

            page_new = 0
            for item in data:
                classes = [str(c).lower() for c in item.get("class_list", [])]
                is_apartment_for_sale = "property_type-apartment-for-sale" in classes
                is_addis = "property_city-addis-ababa" in classes or "property_state-addis-ababa" in classes
                if not (is_apartment_for_sale and is_addis):
                    continue

                detail_url = item.get("link")
                if detail_url and detail_url not in urls:
                    urls.append(detail_url)
                    self.seed_by_url[detail_url] = self._seed_from_api_item(item)
                    page_new += 1

            self.logger.info("API-Seite %s: +%s Links (gesamt %s)", page, page_new, len(urls))
            if self.limit and len(urls) >= self.limit:
                return urls[: self.limit]
            if self.test_mode and len(urls) >= 3:
                return urls[:3]
            if page_new == 0 and page > 3:
                break
            page += 1
            time.sleep(random.uniform(2, 4))
        return urls

    def _format_listing_updated_from_wp_iso(self, iso_str):
        """
        Baut den gleichen Lesetext wie auf der Webseite aus WP-Feldern date/modified,
        z. B. 'Updated on April 8, 2026 at 6:50 pm' — funktioniert auch ohne Detail-HTML.
        """
        if not iso_str or not isinstance(iso_str, str):
            return None
        s = iso_str.strip()
        if not s:
            return None
        try:
            if s.endswith("Z"):
                dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            else:
                base = s[:19] if len(s) >= 19 else s
                dt = datetime.fromisoformat(base)
        except Exception:
            return None
        hour12 = dt.hour % 12
        if hour12 == 0:
            hour12 = 12
        ampm = "am" if dt.hour < 12 else "pm"
        month_name = dt.strftime("%B")
        return f"Updated on {month_name} {dt.day}, {dt.year} at {hour12}:{dt.minute:02d} {ampm}"

    def _seed_from_api_item(self, item):
        meta = item.get("property_meta", {}) or {}
        classes = [str(c).lower() for c in item.get("class_list", [])]
        yoast = item.get("yoast_head_json", {}) or {}

        def first_meta(key):
            value = meta.get(key)
            if isinstance(value, list) and value:
                return value[0]
            return value

        def class_slug(prefix):
            for c in classes:
                if c.startswith(prefix):
                    return c.replace(prefix, "", 1)
            return None

        def slug_to_text(value):
            if not value:
                return None
            return value.replace("-", " ").title()

        def to_int(value):
            try:
                return int(float(str(value).strip()))
            except Exception:
                return None

        def to_float(value):
            try:
                return float(str(value).strip())
            except Exception:
                return None

        def yes_no_to_bool(value):
            if value is None:
                return False
            return str(value).strip().lower() in ("yes", "true", "1")

        title_raw = ((item.get("title") or {}).get("rendered") or "").strip()
        title = clean_text(BeautifulSoup(title_raw, "html.parser").get_text(" ", strip=True)) if title_raw else None

        property_type_slug = class_slug("property_type-")
        property_status_slug = class_slug("property_status-")
        property_area_slug = class_slug("property_area-")
        feature_slugs = [c.replace("property_feature-", "", 1) for c in classes if c.startswith("property_feature-")]

        property_type = slug_to_text(property_type_slug) or first_meta("fave_property_type")
        property_status = slug_to_text(property_status_slug)
        district = slug_to_text(property_area_slug)
        full_address = clean_text(first_meta("fave_property_address") or first_meta("fave_property_map_address"))

        image_candidates = []
        for img in yoast.get("og_image", []) if isinstance(yoast.get("og_image"), list) else []:
            url = img.get("url")
            if url:
                image_candidates.append(url)

        return {
            "property_id": first_meta("fave_property_id"),
            "title": title,
            "price": to_float(first_meta("fave_property_price")),
            "currency": "ETB",
            "property_size_m2": to_float(first_meta("fave_property_size")),
            "land_area_m2": to_float(first_meta("fave_property_land")),
            "bedrooms": to_int(first_meta("fave_property_bedrooms")),
            "bathrooms": to_int(first_meta("fave_property_bathrooms")),
            "garage": to_int(first_meta("fave_property_garage")),
            "property_type": property_type,
            "property_status": property_status,
            "floor": to_int(first_meta("fave_floor")),
            "furnished": yes_no_to_bool(first_meta("fave_furnished")),
            "google_maps_url": None,
            "latitude": to_float(first_meta("houzez_geolocation_lat")),
            "longitude": to_float(first_meta("houzez_geolocation_long")),
            "location_city": "Addis Ababa",
            "location_area": district,
            "location_district": full_address or district,
            "description": clean_text(BeautifulSoup((item.get("content") or {}).get("rendered") or "", "html.parser").get_text(" ", strip=True)),
            "features": sorted(set(feature_slugs)),
            "images": image_candidates,
            "source_listing_updated": self._format_listing_updated_from_wp_iso(
                item.get("modified") or item.get("date")
            ),
        }

    def _playwright_fallback(self, url):
        self.logger.warning("Playwright Fallback für URL: %s", url)
        try:
            from playwright.sync_api import sync_playwright
        except Exception:
            self.logger.error("Playwright nicht installiert, Fallback übersprungen.")
            return None

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(user_agent=random.choice(self.user_agents))
                page = context.new_page()
                page.goto(url, wait_until="networkidle", timeout=60000)
                html = page.content()
                browser.close()
                return html
        except Exception as exc:
            self.logger.error("Playwright Fehler: %s", exc)
            return None

    def _extract_listing_urls(self):
        # Primär über WP-REST, da die Suchseite dynamisch rendert.
        api_urls = self._extract_listing_urls_from_api()
        if api_urls:
            self.logger.info("Nutze WP-API Links: %s", len(api_urls))
            return api_urls
        raise RuntimeError(
            "Keine Inserate aus der RealEthio-API erhalten. "
            "Bitte später erneut versuchen oder Netzwerk/Cloudflare prüfen."
        )

    def _extract_listing_updated_text(self, soup, raw_text):
        """
        Extrahiert z. B. 'Updated on April 4, 2026 at 9:09 pm' aus
        #property-detail-wrap/div/div[1]/span (Houzez block-title-wrap).
        """
        wrap = soup.select_one("#property-detail-wrap")
        if wrap:
            for sel in (".block-title-wrap span", ".block-title-wrap > span"):
                hit = wrap.select_one(sel)
                if hit:
                    t = clean_text(hit.get_text(" ", strip=True))
                    if t and "updated" in t.lower():
                        return t
            outer = wrap.find("div", recursive=False)
            if outer:
                inner = outer.find("div", recursive=False)
                if inner:
                    span = inner.find("span", recursive=False)
                    if span:
                        t = clean_text(span.get_text(" ", strip=True))
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

    def _is_compact_area_label(self, text):
        """Volle Adressen im Houzez-Feld „Area“ ausschließen (Dropdown nur Stadtteile)."""
        if not text or not isinstance(text, str):
            return False
        t = text.strip()
        if len(t) > 48:
            return False
        if t.count(",") > 1:
            return False
        if re.search(r"\b\d{4,5}\b", t):
            return False
        if re.search(r"ethiopia|avenue|street|road|hotel|bank|branch|health\s*center", t, re.I):
            return False
        return True

    def _extract_property_id(self, url, soup):
        text = soup.get_text(" ", strip=True)
        match = re.search(r"\b(RE\d{3,})\b", text)
        if match:
            return match.group(1)
        from_url = re.search(r"(RE\d{3,})", url.upper())
        if from_url:
            return from_url.group(1)
        return _fallback_property_id_from_url(url)

    def _extract_property(self, detail_url, seed=None):
        html = self._request(detail_url)
        if not html:
            if seed:
                fallback = seed.copy()
                if not fallback.get("property_id"):
                    fallback["property_id"] = _fallback_property_id_from_url(detail_url)
                if not fallback.get("title"):
                    fallback["title"] = clean_text(detail_url.rstrip("/").split("/")[-1].replace("-", " ").title())
                fallback.update({
                    "source_website": self.source_website,
                    "source_name": self.source_name,
                    "detail_url": detail_url,
                })
                return fallback
            return None
        # Manche Antworten sind defekt/binaer (z. B. fehlerhaft decodierte Brotli/Gzip-Payloads).
        # Diese Zeichen koennen den Parser mit ValueError stoppen.
        if isinstance(html, str):
            html = html.replace("\x00", "")
        try:
            soup = BeautifulSoup(html, "html.parser")
        except Exception as exc:
            self.logger.warning("Parser-Fehler bei %s: %s", detail_url, exc)
            if seed:
                fallback = seed.copy()
                if not fallback.get("property_id"):
                    fallback["property_id"] = _fallback_property_id_from_url(detail_url)
                if not fallback.get("title"):
                    fallback["title"] = clean_text(detail_url.rstrip("/").split("/")[-1].replace("-", " ").title())
                fallback.update({
                    "source_website": self.source_website,
                    "source_name": self.source_name,
                    "detail_url": detail_url,
                })
                return fallback
            return None
        raw_text = soup.get_text(" ", strip=True)
        listing_updated = self._extract_listing_updated_text(soup, raw_text)

        title = clean_text((soup.select_one("h1.entry-title, h1.property-title") or {}).get_text() if soup.select_one("h1.entry-title, h1.property-title") else None)
        price_text = clean_text((soup.select_one(".price, .property-price, .listing-price") or {}).get_text() if soup.select_one(".price, .property-price, .listing-price") else None)
        currency = "ETB" if price_text and "ETB" in price_text.upper() else "ETB"
        price = parse_number(price_text)

        bedrooms = self._find_int(raw_text, [r"(\d+)\s*bed", r"(\d+)\s*bedroom"])
        bathrooms = self._find_int(raw_text, [r"(\d+)\s*bath", r"(\d+)\s*bathroom"])
        garage = self._find_int(raw_text, [r"(\d+)\s*garage"])
        property_size_m2 = self._extract_property_size_m2(soup, raw_text)
        land_area_m2 = self._find_float(raw_text, [r"land area[:\s]+(\d+(?:\.\d+)?)"])
        if land_area_m2 is None:
            land_raw = self._extract_meta_value(soup, "Land Area")
            if land_raw:
                land_area_m2 = parse_number(re.sub(r"m²|m2|sqm", "", land_raw, flags=re.IGNORECASE))
                if land_area_m2 is not None:
                    land_area_m2 = float(land_area_m2)
        floor = self._find_int(raw_text, [r"floor[:\s]+(\d+)"])
        furnished = bool(re.search(r"furnished[:\s]+(yes|true)", raw_text, re.IGNORECASE))
        district = self._extract_district(soup, raw_text)
        full_address = clean_text(
            (
                soup.select_one("address.item-address, .item-address, .property-address, address")
                or {}
            ).get_text(" ", strip=True)
            if soup.select_one("address.item-address, .item-address, .property-address, address")
            else None
        )

        area_meta = self._extract_meta_value(soup, "Area")
        html_area = clean_text(area_meta) if area_meta else None
        if html_area and not self._is_compact_area_label(html_area):
            html_area = None
        location_area = html_area or district

        property_type = self._extract_meta_value(soup, "Property Type")
        property_status = self._extract_meta_value(soup, "Property Status")
        description = clean_text((soup.select_one(".property-description, .entry-content, .description") or {}).get_text() if soup.select_one(".property-description, .entry-content, .description") else "")
        maps_url = self._extract_maps_url(soup)
        latitude, longitude = parse_lat_lng_from_url(maps_url)
        images = self._extract_images(soup)
        features = self._extract_features(soup, raw_text)
        property_id = self._extract_property_id(detail_url, soup)

        if seed:
            title = title or seed.get("title")
            price = price if price is not None else seed.get("price")
            seed_sz = seed.get("property_size_m2")
            if property_size_m2 is None:
                # API liefert mitunter Plausibilitäts-Müll (z. B. 6); lieber leer als falsch.
                if seed_sz is not None and float(seed_sz) < 10:
                    property_size_m2 = None
                else:
                    property_size_m2 = seed_sz
            elif seed_sz is not None and property_size_m2 < 15 and float(seed_sz) > property_size_m2:
                property_size_m2 = float(seed_sz)
            land_area_m2 = land_area_m2 if land_area_m2 is not None else seed.get("land_area_m2")
            bedrooms = bedrooms if bedrooms is not None else seed.get("bedrooms")
            bathrooms = bathrooms if bathrooms is not None else seed.get("bathrooms")
            garage = garage if garage is not None else seed.get("garage")
            property_type = property_type or seed.get("property_type")
            property_status = property_status or seed.get("property_status")
            floor = floor if floor is not None else seed.get("floor")
            furnished = furnished or seed.get("furnished", False)
            latitude = latitude if latitude is not None else seed.get("latitude")
            longitude = longitude if longitude is not None else seed.get("longitude")
            description = description or seed.get("description")
            if not property_id:
                property_id = seed.get("property_id")
            if seed.get("location_area"):
                location_area = seed["location_area"]
            location_district = full_address or district or seed.get("location_district")
            if not features:
                features = seed.get("features", [])
            elif seed.get("features"):
                features = sorted(set(features + seed.get("features", [])))
            if not images:
                images = seed.get("images", [])
            if not listing_updated:
                listing_updated = seed.get("source_listing_updated")
        else:
            location_district = full_address or district

        property_id = property_id or (seed.get("property_id") if seed else None) or _fallback_property_id_from_url(detail_url)
        title = title or clean_text(detail_url.rstrip("/").split("/")[-1].replace("-", " ").title())

        download_images(images, property_id, UPLOAD_DIR)

        return {
            "property_id": property_id,
            "source_website": self.source_website,
            "source_name": self.source_name,
            "detail_url": detail_url,
            "title": title,
            "price": price,
            "currency": currency,
            "property_size_m2": property_size_m2,
            "land_area_m2": land_area_m2,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "garage": garage,
            "property_type": property_type,
            "property_status": property_status,
            "floor": floor,
            "furnished": furnished,
            "features": features,
            "images": images,
            "google_maps_url": maps_url,
            "latitude": latitude,
            "longitude": longitude,
            "location_city": "Addis Ababa",
            "location_area": location_area,
            "location_district": location_district,
            "description": description,
            "source_listing_updated": listing_updated,
        }

    def _extract_images(self, soup):
        urls = []
        seen = set()

        # Houzez/RealEthio nutzt je nach Template unterschiedliche Attribute
        # (src, data-src, srcset, data-lazy-src, data-original, ...).
        for img in soup.select(".property-gallery img, .gallery img, .swiper-slide img, .listing-gallery img, img"):
            candidates = []
            for key in ("src", "data-src", "data-lazy-src", "data-original", "data-large_image"):
                value = img.get(key)
                if value:
                    candidates.append(value)

            srcset = img.get("srcset") or img.get("data-srcset")
            if srcset:
                for item in srcset.split(","):
                    piece = item.strip().split(" ")[0]
                    if piece:
                        candidates.append(piece)

            for src in candidates:
                full = urljoin("https://realethio.com", src.strip())
                if not full or "/wp-content/" not in full:
                    continue
                if full in seen:
                    continue
                seen.add(full)
                urls.append(full)

        # Fallback: zusätzliche Bild-Links direkt in gallery anchors
        for a in soup.select(".property-gallery a[href], .gallery a[href], .listing-gallery a[href]"):
            href = a.get("href")
            if not href:
                continue
            full = urljoin("https://realethio.com", href.strip())
            if "/wp-content/" in full and full not in seen:
                seen.add(full)
                urls.append(full)

        return urls[:120]

    def _extract_features(self, soup, text):
        features = []
        for li in soup.select(".property-features li, .features li"):
            value = clean_text(li.get_text())
            if value:
                features.append(value.lower().replace(" ", "-"))
        known = ["balcony", "elevator", "garage", "generator", "security", "water-pump", "water-tank"]
        for item in known:
            if item.replace("-", " ") in text.lower() and item not in features:
                features.append(item)
        return sorted(set(features))

    def _extract_maps_url(self, soup):
        iframe = soup.select_one("iframe[src*='google.com/maps']")
        if iframe:
            return iframe.get("src")
        link = soup.select_one("a[href*='google.com/maps']")
        return link.get("href") if link else None

    def _extract_meta_value(self, soup, label):
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

    def _extract_property_size_m2(self, soup, raw_text):
        """
        Houzez zeigt z. B. 'Property Size 176 m²' (Unicode m²). Ein naiver Regex auf 'm2'
        trifft oft zuerst auf HTML-Müll wie '6m2' ohne Leerzeichen — daher strukturierte
        Extraktion und m²-Unterstützung.
        """
        for label in ("Property Size", "Home Area", "Built-up Area", "Building Area", "Property Area"):
            val = self._extract_meta_value(soup, label)
            if val:
                num = parse_number(re.sub(r"m²|m2|sqm", "", val, flags=re.IGNORECASE))
                if num is not None and num >= 10:
                    return float(num)

        for li in soup.select("li"):
            t = clean_text(li.get_text(" ", strip=True) or "")
            if not re.search(r"property\s+size", t, re.IGNORECASE):
                continue
            if re.search(r"land\s+area", t, re.IGNORECASE):
                continue
            num = parse_number(re.sub(r"m²|m2|sqm", "", t, flags=re.IGNORECASE))
            if num is not None and num >= 10:
                return float(num)

        labeled = re.search(
            r"(?:Property\s+Size|Home\s+Area|Built[- ]?up\s+Area)[^\d]{0,40}([\d,]+(?:\.\d+)?)\s*m(?:²|2)\b",
            raw_text,
            re.IGNORECASE,
        )
        if labeled:
            num = parse_number(labeled.group(1))
            if num is not None and num >= 10:
                return float(num)

        candidates = []
        for pat in (
            r"(?<![\w/])([\d,]+(?:\.\d+)?)\s+m²\b",
            r"(?<![\w/])([\d,]+(?:\.\d+)?)\s+m2\b",
            r"(?<![\w/])([\d,]+(?:\.\d+)?)\s+sqm\b",
        ):
            for m in re.finditer(pat, raw_text, re.IGNORECASE):
                num = parse_number(m.group(1))
                if num is not None and 10 <= num <= 200000:
                    candidates.append(num)
        if candidates:
            return float(max(candidates))
        return None

    def _extract_district(self, soup, text):
        breadcrumb = soup.select_one(".breadcrumb, .breadcrumbs")
        if breadcrumb:
            pieces = [clean_text(x.get_text()) for x in breadcrumb.select("a, span")]
            pieces = [x for x in pieces if x and x.lower() not in ("home", "addis ababa")]
            if pieces:
                return pieces[-1]
        match = re.search(r"(bole|kirkos|yeka|lideta|nifas silk|arada|akaky kaliti|kolfe keranio|gulele)", text, re.IGNORECASE)
        return match.group(1).title() if match else None

    def _find_int(self, text, patterns):
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return int(match.group(1))
        return None

    def _find_float(self, text, patterns):
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    return None
        return None

    def scrape(self):
        urls = self._extract_listing_urls()
        if self.limit:
            urls = urls[: self.limit]
        properties = []
        for idx, url in enumerate(urls, start=1):
            self.logger.info("(%s/%s) Scrape Detail: %s", idx, len(urls), url)
            try:
                data = self._extract_property(url, seed=self.seed_by_url.get(url))
            except Exception as exc:
                self.logger.warning("Detail-Scrape Fehler, ueberspringe %s: %s", url, exc)
                continue
            if data:
                properties.append(data)
            if self.limit and len(properties) >= self.limit:
                break
            if self.test_mode and len(properties) >= 3:
                break
        return properties
