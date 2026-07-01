import { POPULAR_AREAS } from "./areaOptions";
import { extractMentionedLocations } from "./locationFromText";

/** Rough bounding box for Addis Ababa. */
export const ADDIS_BOUNDS = {
  minLat: 8.75,
  maxLat: 9.15,
  minLng: 38.55,
  maxLng: 39.05
};

const WRONG_CITIES = [
  "dire dawa",
  "diredawa",
  "hawassa",
  "bahir dar",
  "bahirdar",
  "mekelle",
  "gondar",
  "adama",
  "jimma",
  "harar",
  "jijiga",
];

/** Subcity centers (approx.) — used when no exact coordinates. */
const SUBCITY_CENTERS = {
  yeka: { lat: 9.034, lng: 38.796, radiusM: 2800, label: "Yeka" },
  kirkos: { lat: 8.996, lng: 38.761, radiusM: 2200, label: "Kirkos" },
  bole: { lat: 8.993, lng: 38.787, radiusM: 2500, label: "Bole" },
  lideta: { lat: 9.031, lng: 38.739, radiusM: 2000, label: "Lideta" },
  arada: { lat: 9.033, lng: 38.752, radiusM: 1800, label: "Arada" },
  gulele: { lat: 9.055, lng: 38.758, radiusM: 2200, label: "Gulele" },
  kolfe: { lat: 9.02, lng: 38.718, radiusM: 3500, label: "Kolfe Keranio" },
  "kolfe keranio": { lat: 9.02, lng: 38.718, radiusM: 3500, label: "Kolfe Keranio" },
  "nifas silk": { lat: 8.962, lng: 38.738, radiusM: 3000, label: "Nifas Silk-Lafto" },
  "nifas silk-lafto": { lat: 8.962, lng: 38.738, radiusM: 3000, label: "Nifas Silk-Lafto" },
  "akaki kality": { lat: 8.857, lng: 38.728, radiusM: 4000, label: "Akaki Kality" },
};

/** Neighborhood → subcity fallback for circle placement. */
const NEIGHBORHOOD_SUBCITY = {
  aware: "yeka",
  ayat: "yeka",
  summit: "yeka",
  cmc: "yeka",
  gerji: "bole",
  "bole airport": "bole",
  kazanchis: "kirkos",
  mexico: "kirkos",
  sarbet: "kirkos",
  megenagna: "yeka",
  piassa: "arada",
  lebu: "kolfe",
};

function normalizeKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isInAddisBounds(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  if (la === 0 && lo === 0) return false;
  return (
    la >= ADDIS_BOUNDS.minLat &&
    la <= ADDIS_BOUNDS.maxLat &&
    lo >= ADDIS_BOUNDS.minLng &&
    lo <= ADDIS_BOUNDS.maxLng
  );
}

function containsWrongCity(text) {
  const hay = normalizeKey(text);
  if (!hay) return false;
  return WRONG_CITIES.some((city) => hay.includes(city));
}

export function parseCoordsFromMapUrl(mapUrl) {
  if (!mapUrl || typeof mapUrl !== "string") return null;
  try {
    const parsed = new URL(mapUrl);
    const q = parsed.searchParams.get("q") || "";
    if (containsWrongCity(q)) return null;

    const atMatch = mapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      const lat = Number(atMatch[1]);
      const lng = Number(atMatch[2]);
      if (isInAddisBounds(lat, lng)) return { lat, lng };
    }

    const coordMatch = q.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      const lat = Number(coordMatch[1]);
      const lng = Number(coordMatch[2]);
      if (isInAddisBounds(lat, lng)) return { lat, lng };
    }
  } catch {
    return null;
  }
  return null;
}

function isJustProperty(property) {
  const src = `${property?.source_website || ""} ${property?.source_name || ""}`.toLowerCase();
  return src.includes("just.property") || src.includes("just property");
}

function locationCandidates(property) {
  const candidates = [];
  const area = property?.location_area?.trim();
  const district = property?.location_district?.trim();

  if (isJustProperty(property)) {
    if (district) candidates.push(district);
    if (area) candidates.push(area);
  } else {
    if (area) candidates.push(area);
    if (district) candidates.push(district);
  }

  const text = [property?.title, property?.description, property?.description_original]
    .filter(Boolean)
    .join(" ");
  candidates.push(...extractMentionedLocations(text, POPULAR_AREAS));

  return [...new Set(candidates.filter(Boolean))];
}

function resolveSubcityCenter(name) {
  const key = normalizeKey(name);
  if (!key) return null;

  if (SUBCITY_CENTERS[key]) return SUBCITY_CENTERS[key];

  const mapped = NEIGHBORHOOD_SUBCITY[key];
  if (mapped && SUBCITY_CENTERS[mapped]) return SUBCITY_CENTERS[mapped];

  for (const [subKey, center] of Object.entries(SUBCITY_CENTERS)) {
    if (key.includes(subKey) || subKey.includes(key)) return center;
  }
  for (const [hood, subKey] of Object.entries(NEIGHBORHOOD_SUBCITY)) {
    if (key.includes(hood) && SUBCITY_CENTERS[subKey]) return SUBCITY_CENTERS[subKey];
  }
  return null;
}

/**
 * Resolve how to show a listing on the map.
 * @returns {{ mode: 'point', lat: number, lng: number, label?: string }
 *         | { mode: 'circle', lat: number, lng: number, radiusM: number, label: string }
 *         | { mode: 'none' }}
 */
export function resolvePropertyMapLocation(property) {
  const lat = Number(property?.latitude);
  const lng = Number(property?.longitude);

  if (isInAddisBounds(lat, lng)) {
    return { mode: "point", lat, lng, label: property?.location_area || property?.location_district };
  }

  const fromUrl = parseCoordsFromMapUrl(property?.google_maps_url);
  if (fromUrl) {
    return { mode: "point", lat: fromUrl.lat, lng: fromUrl.lng, label: property?.location_area };
  }

  for (const candidate of locationCandidates(property)) {
    if (containsWrongCity(candidate)) continue;
    const center = resolveSubcityCenter(candidate);
    if (center) {
      return {
        mode: "circle",
        lat: center.lat,
        lng: center.lng,
        radiusM: center.radiusM,
        label: candidate
      };
    }
  }

  return { mode: "none" };
}

/** Safe Google Maps text query — never geocode wrong cities. */
export function buildSafeMapQuery(property) {
  const parts = [];
  const area = property?.location_area?.trim();
  const district = property?.location_district?.trim();

  if (isJustProperty(property)) {
    if (district && !containsWrongCity(district)) parts.push(district);
    if (area && !containsWrongCity(area)) parts.push(area);
  } else {
    if (area && !containsWrongCity(area)) parts.push(area);
    if (district && !containsWrongCity(district) && district.length < 60) parts.push(district);
  }

  const mentioned = extractMentionedLocations(
    [property?.title, property?.description].filter(Boolean).join(" ")
  ).filter((a) => !containsWrongCity(a));
  if (mentioned.length) parts.push(mentioned[0]);

  parts.push("Addis Ababa", "Ethiopia");
  return [...new Set(parts.filter(Boolean))].join(", ");
}
