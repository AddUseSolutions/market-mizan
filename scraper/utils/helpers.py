import re
from urllib.parse import parse_qs, urlparse


def clean_text(value):
    if value is None:
        return None
    return re.sub(r"\s+", " ", value).strip()


def parse_number(value):
    if not value:
        return None
    normalized = re.sub(r"[^0-9.,]", "", value).replace(",", "")
    try:
        return float(normalized) if normalized else None
    except ValueError:
        return None


def parse_lat_lng_from_url(maps_url):
    if not maps_url:
        return None, None

    match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", maps_url)
    if match:
        lat, lng = float(match.group(1)), float(match.group(2))
        if coords_in_addis(lat, lng):
            return lat, lng
        return None, None

    parsed = urlparse(maps_url)
    qs = parse_qs(parsed.query)
    if "q" in qs:
        q = qs["q"][0]
        if map_query_mentions_wrong_city(q):
            return None, None
        coord_match = re.search(r"(-?\d+\.\d+),\s*(-?\d+\.\d+)", q)
        if coord_match:
            lat, lng = float(coord_match.group(1)), float(coord_match.group(2))
            if coords_in_addis(lat, lng):
                return lat, lng

    return None, None


ADDIS_BOUNDS = {"min_lat": 8.75, "max_lat": 9.15, "min_lng": 38.55, "max_lng": 39.05}

WRONG_CITIES = (
    "dire dawa",
    "diredawa",
    "hawassa",
    "bahir dar",
    "mekelle",
    "gondar",
    "adama",
    "jimma",
    "harar",
    "jijiga",
)


def coords_in_addis(lat, lng):
    try:
        la = float(lat)
        lo = float(lng)
    except (TypeError, ValueError):
        return False
    if la == 0 and lo == 0:
        return False
    return (
        ADDIS_BOUNDS["min_lat"] <= la <= ADDIS_BOUNDS["max_lat"]
        and ADDIS_BOUNDS["min_lng"] <= lo <= ADDIS_BOUNDS["max_lng"]
    )


def map_query_mentions_wrong_city(text):
    hay = clean_text(text)
    if not hay:
        return False
    low = hay.lower()
    return any(city in low for city in WRONG_CITIES)


def sanitize_maps_fields(row):
    if not coords_in_addis(row.get("latitude"), row.get("longitude")):
        row["latitude"] = None
        row["longitude"] = None
    maps_url = row.get("google_maps_url")
    if maps_url and map_query_mentions_wrong_city(maps_url):
        row["google_maps_url"] = None
    return row
