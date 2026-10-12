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
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** alias (normalized) → canonical display name */
const ALIAS_TO_CANONICAL = new Map();
/** Aliases that are also everyday English words: only trusted in location fields and titles. */
const LOCATION_ONLY_ALIASES = new Set();

function register(canonical, aliases = [], locationOnly = []) {
  ALIAS_TO_CANONICAL.set(norm(canonical), canonical);
  for (const alias of aliases) ALIAS_TO_CANONICAL.set(norm(alias), canonical);
  for (const alias of locationOnly) {
    ALIAS_TO_CANONICAL.set(norm(alias), canonical);
    LOCATION_ONLY_ALIASES.add(norm(alias));
  }
}

register(
  "Bole",
  [
    "gerji", "gotera", "rwanda", "cameroon", "atlas", "bole atlas", "bole michael", "bole medhanialem",
    "medhanialem", "medhane alem", "edna mall", "bole bulbula", "bulbula", "wollo sefer", "wello sefer",
    "wolo sefer", "welo sefer", "bole japan", "bole rwanda", "bole homes", "bole arabsa", "goro", "lem hotel",
    "haya hulet", "hayahulet", "hayhulet", "hayahule", "22 mazoria", "22 mazoriya", "beshale", "jakros", "jacros",
    "jackros", "millennium hall", "dembel", "bole 24", "bole airport", "airport cargo", "imperial", "lemhotel",
    "gergi"
  ],
  ["flamingo"]
);
register(
  "Kirkos",
  [
    "cherkos", "kazanchis", "kasanchis", "mexico", "sarbet", "sar bet", "ras hotel", "tewodros", "meskel square",
    "meskel flower", "bambis", "olympia", "olompia", "legehar", "lancha", "bulgaria", "bulgariya", "bulgaria mazoria", "urael", "beklobet",
    "bekelo bet"
  ],
  ["ambassador", "stadium"]
);
register("Arada", ["piassa", "piazza", "arat kilo", "4 kilo", "sidist kilo", "6 kilo", "menelik", "churchill"]);
register(
  "Yeka",
  [
    "cmc", "megenagna", "ayat", "kotebe", "ferensay", "kara kore", "kara alo", "shola", "gurd shola", "gurdshola",
    "figa", "salite mihret", "hayat", "lamberet", "meri", "meri luke", "yeka abado", "abado", "sumit", "semit",
    "semmit", "wesen", "wossen", "wessen", "sholla"
  ],
  ["summit", "aware", "signal"]
);
register("Nifas Silk-Lafto", [
  "nifas silk", "nifas silk lafto", "lafto", "jemo", "bethel", "kera", "mekanisa", "mekannisa", "saris abo",
  "hana mariam", "hanna mariam", "vatican", "bisrate gabriel", "bisrate gebriel", "bisrate gebreal", "betel",
  "haile garment", "garment"
]);
register("Lideta", ["autobus tera", "autobus", "tekle haymanot", "teklehaimanot"]);
register("Gullele", ["gulele", "shiromeda", "entoto", "kebena", "shegole", "addisu gebeya", "wingate", "winget", "kechene"]);
register("Addis Ketema", ["merkato", "mercato", "sebategna", "mesalemiya", "amanuel"]);
register("Kolfe Keranio", [
  "kolfe", "keranio", "aseko", "asko", "alem gebena", "lebu", "gofa", "akababi", "ayer tena", "tor hailoch",
  "torhailoch", "torhailoche", "torhayloch", "tor hayloch", "alem bank"
]);
register("Akaki Kaliti", ["akaki", "akaki kality", "kaliti", "kality", "saris", "welliyo", "kilinto"]);
register("Lemi Kura", ["lemikura", "lemi"]);

/** Towns outside Addis Ababa: never assign a sub-city from incidental description mentions. */
const OUTSIDE_ADDIS = [
  "bishoftu", "debre zeit", "debrezeit", "debre zeyit", "dukem", "sebeta", "burayu", "sululta", "legetafo",
  "lege tafo", "legedadi", "sheger", "alemgena", "alem gena", "gelan", "adama", "hawassa", "bahir dar", "mojo",
  "modjo", "oromia"
].map(norm);

const SORTED_ALIAS_KEYS = [...ALIAS_TO_CANONICAL.keys()].sort((a, b) => b.length - a.length);

function isCanonicalArea(value) {
  const key = norm(value);
  return CANONICAL_AREAS.some((a) => norm(a) === key);
}

function containsPhrase(hay, phrase) {
  return ` ${hay} `.includes(` ${phrase} `);
}

const CANONICAL_KEYS = CANONICAL_AREAS.map(norm).sort((a, b) => b.length - a.length);

function matchInText(text, { allowLocationOnly = true } = {}) {
  const hay = norm(text);
  if (!hay) return null;
  // An explicitly named sub-city ("Wollo Sefer, Kirkos") beats neighborhood aliases.
  for (const key of CANONICAL_KEYS) {
    if (containsPhrase(hay, key)) return ALIAS_TO_CANONICAL.get(key);
  }
  for (const key of SORTED_ALIAS_KEYS) {
    if (key.length < 3) continue;
    if (!allowLocationOnly && LOCATION_ONLY_ALIASES.has(key)) continue;
    if (containsPhrase(hay, key)) return ALIAS_TO_CANONICAL.get(key);
  }
  return null;
}

function mentionsOutsideAddis(text) {
  const hay = norm(text);
  return Boolean(hay) && OUTSIDE_ADDIS.some((town) => containsPhrase(hay, town));
}

/**
 * Resolve scraped / messy area labels to one of the 11 canonical sub-cities.
 * Returns null when the listing names no known Addis neighborhood (or is outside Addis).
 */
function resolveCanonicalArea(input = {}) {
  const locationFields = [input.canonical_area, input.location_area, input.location_district, input.title].filter(Boolean);
  const descriptionFields = [input.description, input.description_original].filter(Boolean);

  for (const field of locationFields) {
    const direct = ALIAS_TO_CANONICAL.get(norm(field));
    if (direct) return direct;
  }
  for (const field of locationFields) {
    const matched = matchInText(field);
    if (matched) return matched;
  }
  if (locationFields.some(mentionsOutsideAddis)) return null;
  for (const field of descriptionFields) {
    const matched = matchInText(field, { allowLocationOnly: false });
    if (matched) return matched;
  }
  return null;
}

/** Kept for callers that need a value; unresolved listings stay unassigned instead of a wrong sub-city. */
function resolveCanonicalAreaOrDefault(input = {}) {
  return resolveCanonicalArea(input);
}

module.exports = {
  CANONICAL_AREAS,
  resolveCanonicalArea,
  resolveCanonicalAreaOrDefault,
  isCanonicalArea
};
