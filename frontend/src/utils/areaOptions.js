/**
 * Dropdown „Area“: Werte = distinct `location_area` (keine Adress-Teile).
 */
export function uniqueSortedAreas(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (item == null) continue;
    const t = String(item).trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.sort((a, b) => a.localeCompare(b, "en"));
}
