/** Popular Addis Ababa areas shown first in dropdowns. */
export const POPULAR_AREAS = [
  "Bole",
  "Kazanchis",
  "CMC",
  "Megenagna",
  "Gerji",
  "Sarbet",
  "Piassa",
  "Lebu",
  "Summit",
  "Ayat",
];

const MEANINGLESS = /^[-–—_\s.]+$/i;

function cleanDisplayLabel(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeKey(raw) {
  return cleanDisplayLabel(raw).toLowerCase();
}

/**
 * Dropdown „Area“: distinct `location_area`, deduplicated and sorted.
 * Popular areas first, then alphabetical.
 */
export function uniqueSortedAreas(list) {
  if (!Array.isArray(list)) return [];

  const best = new Map();

  for (const item of list) {
    if (item == null) continue;
    const display = cleanDisplayLabel(item);
    if (!display || MEANINGLESS.test(display) || display === "—") continue;

    const key = normalizeKey(display);
    if (!best.has(key)) {
      best.set(key, display);
      continue;
    }
    const existing = best.get(key);
    if (display.length < existing.length || (display[0] === display[0]?.toUpperCase() && existing[0] !== existing[0]?.toUpperCase())) {
      best.set(key, display);
    }
  }

  const all = [...best.values()];
  const popularSet = new Set(POPULAR_AREAS.map((a) => normalizeKey(a)));
  const popular = [];
  const rest = [];

  for (const area of all) {
    if (popularSet.has(normalizeKey(area))) popular.push(area);
    else rest.push(area);
  }

  popular.sort((a, b) => {
    const ai = POPULAR_AREAS.findIndex((p) => normalizeKey(p) === normalizeKey(a));
    const bi = POPULAR_AREAS.findIndex((p) => normalizeKey(p) === normalizeKey(b));
    return ai - bi;
  });
  rest.sort((a, b) => a.localeCompare(b, "en"));

  return [...popular, ...rest];
}
