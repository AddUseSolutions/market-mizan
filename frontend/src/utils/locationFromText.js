import { POPULAR_AREAS } from "./areaOptions";

const EXTRA_AREAS = [
  "Yeka",
  "Kirkos",
  "Kolfe",
  "Lideta",
  "Arada",
  "Gulele",
  "Nifas Silk",
  "Akaki Kality",
  "Bole Airport",
  "Mexico",
  "Kazanchis",
  "Sarbet",
  "Gerji",
  "Summit",
  "Ayat",
  "CMC",
  "Megenagna",
  "Piassa",
  "Lebu",
  "Bole",
];

function normalize(s) {
  return String(s || "").trim().toLowerCase();
}

/** Find neighborhood/area names mentioned in listing text. */
export function extractMentionedLocations(text, extraAreas = []) {
  const haystack = normalize(text);
  if (!haystack) return [];

  const catalog = [...new Set([...POPULAR_AREAS, ...EXTRA_AREAS, ...extraAreas])]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const found = [];
  for (const area of catalog) {
    const key = normalize(area);
    if (key.length < 3) continue;
    if (haystack.includes(key)) found.push(area);
  }
  return found;
}

/** Street-like fragments from description (e.g. "Chad St", "Bole Road"). */
export function extractStreetMentions(text) {
  const matches = String(text || "").match(
    /\b([A-Za-z][A-Za-z0-9.'-]*(?:\s+[A-Za-z][A-Za-z0-9.'-]*){0,3}\s+(?:St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard))\b/gi
  );
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.trim()))];
}

/** Best Google Maps query from property fields + description. */
export function buildMapHighlightQuery(property, knownAreas = []) {
  const parts = [];
  const desc = [property?.description, property?.description_original, property?.title]
    .filter(Boolean)
    .join(" ");

  const streets = extractStreetMentions(desc);
  if (streets.length) parts.push(streets[0]);

  const mentioned = extractMentionedLocations(desc, knownAreas);
  if (mentioned.length) parts.push(mentioned[0]);

  if (property?.location_area) parts.push(property.location_area);
  if (property?.location_district) parts.push(property.location_district);

  parts.push("Addis Ababa", "Ethiopia");
  return [...new Set(parts.filter(Boolean))].join(", ");
}
