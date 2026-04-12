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
        return float(match.group(1)), float(match.group(2))

    parsed = urlparse(maps_url)
    qs = parse_qs(parsed.query)
    if "q" in qs:
        coord_match = re.search(r"(-?\d+\.\d+),\s*(-?\d+\.\d+)", qs["q"][0])
        if coord_match:
            return float(coord_match.group(1)), float(coord_match.group(2))

    return None, None
