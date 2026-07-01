import { POPULAR_AREAS } from "./areaOptions";
import { extractMentionedLocations, extractStreetMentions } from "./locationFromText";

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

/** Subcity labels for place-query fallback. */
const SUBCITY_CENTERS = {
  yeka: { label: "Yeka" },
  kirkos: { label: "Kirkos" },
  bole: { label: "Bole" },
  lideta: { label: "Lideta" },
  arada: { label: "Arada" },
  gulele: { label: "Gulele" },
  kolfe: { label: "Kolfe Keranio" },
  "kolfe keranio": { label: "Kolfe Keranio" },
  "nifas silk": { label: "Nifas Silk-Lafto" },
  "nifas silk-lafto": { label: "Nifas Silk-Lafto" },
  "akaki kality": { label: "Akaki Kality" },
};

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

export function parsePlaceQueryFromMapUrl(mapUrl) {
  if (!mapUrl || typeof mapUrl !== "string") return null;
  try {
    const parsed = new URL(mapUrl);
    const q = (parsed.searchParams.get("q") || "").trim();
    if (!q || containsWrongCity(q)) return null;
    if (/(-?\d+\.\d+),\s*(-?\d+\.\d+)/.test(q)) return null;
    return q;
  } catch {
    return null;
  }
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

function buildPlaceQuery(candidate) {
  const key = normalizeKey(candidate);
  if (!key || containsWrongCity(candidate)) return null;

  if (SUBCITY_CENTERS[key]) {
    return `${SUBCITY_CENTERS[key].label}, Addis Ababa, Ethiopia`;
  }

  const parent = NEIGHBORHOOD_SUBCITY[key];
  if (parent && SUBCITY_CENTERS[parent]) {
    return `${candidate}, ${SUBCITY_CENTERS[parent].label}, Addis Ababa, Ethiopia`;
  }

  const subcity = resolveSubcityCenter(candidate);
  if (subcity && normalizeKey(subcity.label) !== key) {
    return `${candidate}, ${subcity.label}, Addis Ababa, Ethiopia`;
  }

  return `${candidate}, Addis Ababa, Ethiopia`;
}

function buildStreetQuery(property) {
  const desc = [property?.description, property?.description_original, property?.title]
    .filter(Boolean)
    .join(" ");
  const streets = extractStreetMentions(desc);
  if (!streets.length) return null;

  const area = property?.location_area?.trim();
  const district = property?.location_district?.trim();
  const locality = area || district;
  const parts = [streets[0]];
  if (locality && !containsWrongCity(locality)) parts.push(locality);
  parts.push("Addis Ababa", "Ethiopia");
  return [...new Set(parts.filter(Boolean))].join(", ");
}

/**
 * Resolve how to show a listing on Google Maps.
 * @returns {{ mode: 'point', lat: number, lng: number, zoom?: number, label?: string }
 *         | { mode: 'place', query: string, zoom: number, label?: string }
 *         | { mode: 'none' }}
 */
export function resolvePropertyMapLocation(property) {
  const lat = Number(property?.latitude);
  const lng = Number(property?.longitude);

  if (isInAddisBounds(lat, lng)) {
    return {
      mode: "point",
      lat,
      lng,
      zoom: 16,
      label: property?.location_area || property?.location_district
    };
  }

  const fromUrl = parseCoordsFromMapUrl(property?.google_maps_url);
  if (fromUrl) {
    return { mode: "point", lat: fromUrl.lat, lng: fromUrl.lng, zoom: 16, label: property?.location_area };
  }

  const streetQuery = buildStreetQuery(property);
  if (streetQuery) {
    return { mode: "place", query: streetQuery, zoom: 16, label: property?.location_area };
  }

  const urlPlace = parsePlaceQueryFromMapUrl(property?.google_maps_url);
  if (urlPlace) {
    return { mode: "place", query: urlPlace, zoom: 16 };
  }

  for (const candidate of locationCandidates(property)) {
    const query = buildPlaceQuery(candidate);
    if (query) {
      const isSubcity = Boolean(SUBCITY_CENTERS[normalizeKey(candidate)]);
      return {
        mode: "place",
        query,
        zoom: isSubcity ? 13 : 14,
        label: candidate
      };
    }
  }

  return { mode: "none" };
}

/** Google Maps embed URL for a resolved location. */
export function buildGoogleMapsEmbedUrl(resolved) {
  if (!resolved || resolved.mode === "none") return null;
  const zoom = resolved.zoom ?? (resolved.mode === "point" ? 16 : 13);
  if (resolved.mode === "point") {
    return `https://www.google.com/maps?q=${resolved.lat},${resolved.lng}&z=${zoom}&output=embed`;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(resolved.query)}&z=${zoom}&output=embed`;
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
