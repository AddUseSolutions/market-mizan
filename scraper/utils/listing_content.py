"""Fact-based listing descriptions and image limits."""

MAX_IMAGES = 6

ROOM_KEYWORDS = (
    ("living", 0),
    ("lounge", 0),
    ("bed", 1),
    ("bath", 2),
    ("kitchen", 3),
    ("facade", 4),
    ("front", 4),
    ("exterior", 4),
    ("garden", 5),
    ("yard", 5),
)


def _score_image(url: str) -> tuple:
    low = (url or "").lower()
    for keyword, slot in ROOM_KEYWORDS:
        if keyword in low:
            return (slot, url)
    return (99, url)


def limit_images(urls: list, max_count: int = MAX_IMAGES) -> list:
    clean = [u.strip() for u in (urls or []) if isinstance(u, str) and u.strip()]
    if len(clean) <= max_count:
        return clean
    scored = sorted((_score_image(u) for u in clean), key=lambda x: (x[0], x[1]))
    picked = []
    used_slots = set()
    for slot, url in scored:
        if url in picked:
            continue
        if slot < max_count and slot not in used_slots:
            picked.append(url)
            used_slots.add(slot)
        if len(picked) >= max_count:
            break
    for _, url in scored:
        if len(picked) >= max_count:
            break
        if url not in picked:
            picked.append(url)
    return picked[:max_count]


def summarize_description(data: dict, raw_description: str | None = None) -> str:
    """Build a short factual summary — avoid copy/paste from source sites."""
    parts = []
    status = (data.get("property_status") or "").strip()
    ptype = (data.get("property_type") or "property").strip()
    area = (data.get("location_area") or data.get("location_district") or "Addis Ababa").strip()
    beds = data.get("bedrooms")
    baths = data.get("bathrooms")
    size = data.get("property_size_m2")
    land = data.get("land_area_m2")
    furnished = data.get("furnished")

    if status:
        parts.append(status)
    parts.append(f"{ptype} in {area}.")
    specs = []
    if beds is not None:
        specs.append(f"{beds} bedroom{'s' if int(beds) != 1 else ''}")
    if baths is not None:
        specs.append(f"{baths} bathroom{'s' if int(baths) != 1 else ''}")
    if size:
        specs.append(f"{size} m² built area")
    if land:
        specs.append(f"{land} m² land")
    if furnished:
        specs.append("furnished")
    if specs:
        parts.append(" ".join(specs).capitalize() + ".")
    features = [f for f in (data.get("features") or []) if f][:4]
    if features:
        parts.append("Features: " + ", ".join(features) + ".")
    parts.append("Listing aggregated from the source platform; verify details on the original site.")
    text = " ".join(parts)
    if len(text) > 600:
        text = text[:597] + "..."
    return text.strip()
