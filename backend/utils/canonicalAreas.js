/** Official Addis Ababa sub-cities for filters and listing assignment. */
const CANONICAL_AREAS = [
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
  "Lemi Kura"
];

function norm(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/-/g, " ");
}

/** alias (normalized) → canonical display name */
const ALIAS_TO_CANONICAL = new Map();

function register(canonical, aliases = []) {
  ALIAS_TO_CANONICAL.set(norm(canonical), canonical);
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(norm(alias), canonical);
  }
}

register("Bole", [
  "bole",
  "gerji",
  "gotera",
  "rwanda",
  "cameroon",
  "bole atlas",
  "bole michael",
  "bole medhanialem",
  "bulbula",
  "wollo sefer"
]);
register("Kirkos", [
  "kirkos",
  "cherkos",
  "kazanchis",
  "kazanchis area",
  "mexico",
  "sarbet",
  "ambassador",
  "national",
  "ras hotel",
  "tewodros"
]);
register("Arada", ["arada", "piassa", "piazza", "arat kilo", "sidist kilo", "menelik", "churchill"]);
register("Yeka", [
  "yeka",
  "cmc",
  "megenagna",
  "summit",
  "ayat",
  "aware",
  "kotebe",
  "ferensay",
  "kara kore",
  "shola",
  "bole bulbula"
]);
register("Nifas Silk-Lafto", [
  "nifas silk",
  "nifas silk lafto",
  "nifas silk-lafto",
  "lafto",
  "jemo",
  "bethel",
  "kera",
  "mekanisa",
  "saris abo"
]);
register("Lideta", ["lideta", "autobus tera", "autobus", "tekle haymanot"]);
register("Gullele", ["gullele", "gulele", "shiromeda", "entoto", "kebena"]);
register("Addis Ketema", [
  "addis ketema",
  "kifle ketema",
  "merkato",
  "mercato",
  "atlas",
  "sebategna"
]);
register("Kolfe Keranio", [
  "kolfe keranio",
  "kolfe",
  "keranio",
  "aseko",
  "alem gebena",
  "lebu",
  "gofa",
  "akababi"
]);
register("Akaki Kaliti", [
  "akaki kaliti",
  "akaki kality",
  "akaki",
  "kaliti",
  "kality",
  "saris",
  "welliyo",
  "kaliti sub city"
]);
register("Lemi Kura", ["lemi kura", "lemikura", "lemi"]);

const SORTED_ALIAS_KEYS = [...ALIAS_TO_CANONICAL.keys()].sort((a, b) => b.length - a.length);

function isCanonicalArea(value) {
  const key = norm(value);
  return CANONICAL_AREAS.some((a) => norm(a) === key);
}

function matchInText(text) {
  const hay = norm(text);
  if (!hay) return null;
  for (const key of SORTED_ALIAS_KEYS) {
    if (key.length < 3) continue;
    if (hay === key || hay.includes(key)) {
      return ALIAS_TO_CANONICAL.get(key);
    }
  }
  return null;
}

/**
 * Resolve scraped / messy area labels to one of the 11 canonical sub-cities.
 */
function resolveCanonicalArea(input = {}) {
  const fields = [
    input.canonical_area,
    input.location_area,
    input.location_district,
    input.title,
    input.description,
    input.description_original
  ].filter(Boolean);

  for (const field of fields) {
    const direct = ALIAS_TO_CANONICAL.get(norm(field));
    if (direct) return direct;
  }

  for (const field of fields) {
    const matched = matchInText(field);
    if (matched) return matched;
  }

  const combined = fields.join(" ");
  const fromCombined = matchInText(combined);
  if (fromCombined) return fromCombined;

  return null;
}

function resolveCanonicalAreaOrDefault(input = {}) {
  return resolveCanonicalArea(input) || "Addis Ketema";
}

module.exports = {
  CANONICAL_AREAS,
  resolveCanonicalArea,
  resolveCanonicalAreaOrDefault,
  isCanonicalArea
};
