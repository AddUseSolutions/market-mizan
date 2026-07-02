/** Official Addis Ababa sub-cities — keep in sync with backend/utils/canonicalAreas.js */
export const CANONICAL_SUBCITIES = [
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

/** @deprecated Use CANONICAL_SUBCITIES for filter dropdowns. */
export const POPULAR_AREAS = [...CANONICAL_SUBCITIES];

/** Fixed list for area filter and listing upload dropdowns. */
export function getAreaFilterOptions() {
  return [...CANONICAL_SUBCITIES];
}

/**
 * Legacy helper — returns only the 11 canonical sub-cities (ignores DB noise).
 */
export function uniqueSortedAreas() {
  return getAreaFilterOptions();
}
