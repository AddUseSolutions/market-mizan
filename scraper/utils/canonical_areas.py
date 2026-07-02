"""Map listing locations to one of 11 Addis Ababa sub-cities."""
from __future__ import annotations

CANONICAL_AREAS = [
    "Bole",
    "Kirkos",
    "Arada",
    "Yeka",
    "Nifas Silk-Lafto",
    "Lideta",
    "Gullele",
    "Addis Ketema",
    "Kolfe Keranio",
    "Akaki Kaliti",
    "Lemi Kura",
]


def _norm(value: str | None) -> str:
    if not value:
        return ""
    return (
        str(value)
        .strip()
        .lower()
        .replace(".", " ")
        .replace("_", " ")
        .replace("-", " ")
    )


def _register(mapping: dict, canonical: str, aliases: list[str]) -> None:
    mapping[_norm(canonical)] = canonical
    for alias in aliases:
        mapping[_norm(alias)] = canonical


def _build_alias_map() -> dict[str, str]:
    m: dict[str, str] = {}
    _register(m, "Bole", ["gerji", "gotera", "rwanda", "cameroon", "bole atlas", "bole michael"])
    _register(m, "Kirkos", ["cherkos", "kazanchis", "mexico", "sarbet", "ambassador", "tewodros"])
    _register(m, "Arada", ["piassa", "piazza", "arat kilo", "sidist kilo", "menelik", "churchill"])
    _register(m, "Yeka", ["cmc", "megenagna", "summit", "ayat", "aware", "kotebe", "ferensay", "kara kore"])
    _register(m, "Nifas Silk-Lafto", ["nifas silk", "nifas silk lafto", "lafto", "jemo", "bethel", "kera", "mekanisa"])
    _register(m, "Lideta", ["autobus tera", "autobus", "tekle haymanot"])
    _register(m, "Gullele", ["gulele", "shiromeda", "entoto", "kebena"])
    _register(m, "Addis Ketema", ["kifle ketema", "merkato", "mercato", "sebategna"])
    _register(m, "Kolfe Keranio", ["kolfe", "keranio", "aseko", "alem gebena", "lebu", "gofa"])
    _register(m, "Akaki Kaliti", ["akaki kality", "akaki", "kaliti", "kality", "saris", "welliyo"])
    _register(m, "Lemi Kura", ["lemikura", "lemi"])
    return m


_ALIAS_MAP = _build_alias_map()
_SORTED_KEYS = sorted(_ALIAS_MAP.keys(), key=len, reverse=True)


def _match_in_text(text: str | None) -> str | None:
    hay = _norm(text)
    if not hay:
        return None
    for key in _SORTED_KEYS:
        if len(key) < 3:
            continue
        if hay == key or key in hay:
            return _ALIAS_MAP[key]
    return None


def resolve_canonical_area(row: dict | None) -> str | None:
    if not row:
        return None
    fields = [
        row.get("canonical_area"),
        row.get("location_area"),
        row.get("location_district"),
        row.get("title"),
        row.get("description"),
        row.get("description_original"),
    ]
    for field in fields:
        if not field:
            continue
        direct = _ALIAS_MAP.get(_norm(field))
        if direct:
            return direct
    for field in fields:
        matched = _match_in_text(field)
        if matched:
            return matched
    combined = " ".join(str(f) for f in fields if f)
    return _match_in_text(combined)


def resolve_canonical_area_or_default(row: dict | None) -> str:
    return resolve_canonical_area(row) or "Addis Ketema"


def apply_canonical_area(row: dict) -> dict:
    if not row:
        return row
    row["canonical_area"] = resolve_canonical_area_or_default(row)
    return row
