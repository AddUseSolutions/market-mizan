"""Map listing locations to one of 11 Addis Ababa sub-cities.

Mirrors backend/utils/canonicalAreas.js — keep the alias lists in sync.
Unresolved listings get None (unassigned) rather than a wrong sub-city;
the backend recomputes all areas on boot with the same rules.
"""
from __future__ import annotations

import re

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
    return re.sub(r"[^a-z0-9]+", " ", str(value).lower()).strip()


_ALIAS_MAP: dict[str, str] = {}
_LOCATION_ONLY: set[str] = set()


def _register(canonical: str, aliases: list[str], location_only: list[str] | None = None) -> None:
    _ALIAS_MAP[_norm(canonical)] = canonical
    for alias in aliases:
        _ALIAS_MAP[_norm(alias)] = canonical
    for alias in location_only or []:
        _ALIAS_MAP[_norm(alias)] = canonical
        _LOCATION_ONLY.add(_norm(alias))


_register(
    "Bole",
    [
        "gerji", "gotera", "rwanda", "cameroon", "atlas", "bole atlas", "bole michael", "bole medhanialem",
        "medhanialem", "medhane alem", "edna mall", "bole bulbula", "bulbula", "wollo sefer", "wello sefer",
        "wolo sefer", "welo sefer", "bole japan", "bole rwanda", "bole homes", "bole arabsa", "goro", "lem hotel",
        "haya hulet", "hayahulet", "hayhulet", "hayahule", "22 mazoria", "22 mazoriya", "beshale", "jakros", "jacros",
        "jackros", "millennium hall", "dembel", "bole 24", "bole airport", "airport cargo", "imperial", "lemhotel",
        "gergi",
    ],
    ["flamingo"],
)
_register(
    "Kirkos",
    [
        "cherkos", "kazanchis", "kasanchis", "mexico", "sarbet", "sar bet", "ras hotel", "tewodros", "meskel square",
        "meskel flower", "bambis", "olympia", "olompia", "legehar", "lancha", "bulgaria", "bulgariya",
        "bulgaria mazoria", "urael", "beklobet", "bekelo bet",
    ],
    ["ambassador", "stadium"],
)
_register("Arada", ["piassa", "piazza", "arat kilo", "4 kilo", "sidist kilo", "6 kilo", "menelik", "churchill"])
_register(
    "Yeka",
    [
        "cmc", "megenagna", "ayat", "kotebe", "ferensay", "kara kore", "kara alo", "shola", "gurd shola", "gurdshola",
        "figa", "salite mihret", "hayat", "lamberet", "meri", "meri luke", "yeka abado", "abado", "sumit", "semit",
        "semmit", "wesen", "wossen", "wessen", "sholla",
    ],
    ["summit", "aware", "signal"],
)
_register(
    "Nifas Silk-Lafto",
    [
        "nifas silk", "nifas silk lafto", "lafto", "jemo", "bethel", "kera", "mekanisa", "mekannisa", "saris abo",
        "hana mariam", "hanna mariam", "vatican", "bisrate gabriel", "bisrate gebriel", "bisrate gebreal", "betel",
        "haile garment", "garment",
    ],
)
_register("Lideta", ["autobus tera", "autobus", "tekle haymanot", "teklehaimanot"])
_register("Gullele", ["gulele", "shiromeda", "entoto", "kebena", "shegole", "addisu gebeya", "wingate", "winget", "kechene"])
_register("Addis Ketema", ["merkato", "mercato", "sebategna", "mesalemiya", "amanuel"])
_register(
    "Kolfe Keranio",
    [
        "kolfe", "keranio", "aseko", "asko", "alem gebena", "lebu", "gofa", "akababi", "ayer tena", "tor hailoch",
        "torhailoch", "torhailoche", "torhayloch", "tor hayloch", "alem bank",
    ],
)
_register("Akaki Kaliti", ["akaki", "akaki kality", "kaliti", "kality", "saris", "welliyo", "kilinto"])
_register("Lemi Kura", ["lemikura", "lemi"])

_OUTSIDE_ADDIS = [
    _norm(t)
    for t in [
        "bishoftu", "debre zeit", "debrezeit", "debre zeyit", "dukem", "sebeta", "burayu", "sululta", "legetafo",
        "lege tafo", "legedadi", "sheger", "alemgena", "alem gena", "gelan", "adama", "hawassa", "bahir dar", "mojo",
        "modjo", "oromia",
    ]
]

_SORTED_KEYS = sorted(_ALIAS_MAP.keys(), key=len, reverse=True)
_CANONICAL_KEYS = sorted((_norm(a) for a in CANONICAL_AREAS), key=len, reverse=True)


def _contains(hay: str, phrase: str) -> bool:
    return f" {phrase} " in f" {hay} "


def _match_in_text(text: str | None, allow_location_only: bool = True) -> str | None:
    hay = _norm(text)
    if not hay:
        return None
    for key in _CANONICAL_KEYS:
        if _contains(hay, key):
            return _ALIAS_MAP[key]
    for key in _SORTED_KEYS:
        if len(key) < 3:
            continue
        if not allow_location_only and key in _LOCATION_ONLY:
            continue
        if _contains(hay, key):
            return _ALIAS_MAP[key]
    return None


def _mentions_outside_addis(text: str | None) -> bool:
    hay = _norm(text)
    return bool(hay) and any(_contains(hay, town) for town in _OUTSIDE_ADDIS)


def resolve_canonical_area(row: dict | None) -> str | None:
    if not row:
        return None
    location_fields = [
        f for f in (row.get("canonical_area"), row.get("location_area"), row.get("location_district"), row.get("title")) if f
    ]
    description_fields = [f for f in (row.get("description"), row.get("description_original")) if f]

    for field in location_fields:
        direct = _ALIAS_MAP.get(_norm(field))
        if direct:
            return direct
    for field in location_fields:
        matched = _match_in_text(field)
        if matched:
            return matched
    if any(_mentions_outside_addis(f) for f in location_fields):
        return None
    for field in description_fields:
        matched = _match_in_text(field, allow_location_only=False)
        if matched:
            return matched
    return None


def resolve_canonical_area_or_default(row: dict | None) -> str | None:
    return resolve_canonical_area(row)


def apply_canonical_area(row: dict) -> dict:
    if not row:
        return row
    row["canonical_area"] = resolve_canonical_area_or_default(row)
    return row
