import { CANONICAL_SUBCITIES } from "./areaOptions";
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

const CANONICAL_KEYS = new Set(CANONICAL_SUBCITIES.map((a) => normalizeKey(a)));

/** Neighborhoods / aliases — for precise map queries (not filter dropdown). */
const MAP_NEIGHBORHOOD_NAMES = [
  "Gerji",
  "Kazanchis",
  "Mexico",
  "Sarbet",
  "Aware",
  "CMC",
  "Megenagna",
  "Summit",
  "Ayat",
  "Kotebe",
  "Piassa",
  "Mercato",
  "Merkato",
  "Lafto",
  "Jemo",
  "Bethel",
  "Gotera",
  "Bulbula",
  "Entoto",
  "Shiromeda",
  "Lebu",
  "Saris",
  "Bole Airport",
];

/** normalized neighborhood → parent sub-city label for Google place query */
const NEIGHBORHOOD_PARENT = {
  aware: "Yeka",
  cmc: "Yeka",
  megenagna: "Yeka",
  summit: "Yeka",
  ayat: "Yeka",
  kotebe: "Yeka",
  ferensay: "Yeka",
  gerji: "Bole",
  "bole airport": "Bole",
  gotera: "Bole",
  bulbula: "Bole",
  kazanchis: "Kirkos",
  mexico: "Kirkos",
  sarbet: "Kirkos",
  piassa: "Arada",
  piazza: "Arada",
  mercato: "Addis Ketema",
  merkato: "Addis Ketema",
  lafto: "Nifas Silk-Lafto",
  jemo: "Nifas Silk-Lafto",
  bethel: "Nifas Silk-Lafto",
  lebu: "Kolfe Keranio",
  saris: "Akaki Kaliti",
  entoto: "Gullele",
  shiromeda: "Gullele",
};

const SUBCITY_LABELS = Object.fromEntries(
  CANONICAL_SUBCITIES.map((name) => [normalizeKey(name), name])
);

function normalizeKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isCanonicalSubcity(name) {
  return CANONICAL_KEYS.has(normalizeKey(name));
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

/** Approximate centers for upload map — keyed by canonical sub-city name. */
export const SUBCITY_CENTERS = {
  Bole: { lat: 8.995, lng: 38.789 },
  Kirkos: { lat: 9.01, lng: 38.758 },
  Arada: { lat: 9.03, lng: 38.752 },
  Yeka: { lat: 9.02, lng: 38.81 },
  "Nifas Silk-Lafto": { lat: 8.96, lng: 38.735 },
  Lideta: { lat: 9.005, lng: 38.735 },
  Gullele: { lat: 9.055, lng: 38.735 },
  "Addis Ketema": { lat: 9.025, lng: 38.738 },
  "Kolfe Keranio": { lat: 8.99, lng: 38.71 },
  "Akaki Kaliti": { lat: 8.88, lng: 38.78 },
  "Lemi Kura": { lat: 8.92, lng: 38.82 },
};

export const ADDIS_DEFAULT_CENTER = { lat: 8.9806, lng: 38.7578 };

export function getSubcityCenter(area) {
  if (!area) return ADDIS_DEFAULT_CENTER;
  return SUBCITY_CENTERS[area] || ADDIS_DEFAULT_CENTER;
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

/** Most specific place names first — neighborhoods before sub-cities. */
function mapPlaceCandidates(property) {
  const seen = new Set();
  const candidates = [];

  const add = (name) => {
    const label = String(name || "").trim();
    if (!label || containsWrongCity(label)) return;
    const key = normalizeKey(label);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(label);
  };

  const area = property?.location_area?.trim();
  const district = property?.location_district?.trim();
  const text = [property?.title, property?.description, property?.description_original]
    .filter(Boolean)
    .join(" ");

  if (isJustProperty(property)) {
    if (area) add(area);
    if (district && normalizeKey(district) !== normalizeKey(area)) add(district);
  } else {
    if (area) add(area);
    if (district && normalizeKey(district) !== normalizeKey(area)) add(district);
  }

  for (const name of extractMentionedLocations(text, MAP_NEIGHBORHOOD_NAMES)) {
    add(name);
  }
  for (const name of extractMentionedLocations(text, CANONICAL_SUBCITIES)) {
    add(name);
  }

  if (property?.canonical_area) add(property.canonical_area);

  return candidates.sort((a, b) => {
    const aSub = isCanonicalSubcity(a) ? 1 : 0;
    const bSub = isCanonicalSubcity(b) ? 1 : 0;
    if (aSub !== bSub) return aSub - bSub;
    return a.length - b.length;
  });
}

function parentSubcityFor(name) {
  const key = normalizeKey(name);
  if (NEIGHBORHOOD_PARENT[key]) return NEIGHBORHOOD_PARENT[key];
  if (SUBCITY_LABELS[key]) return SUBCITY_LABELS[key];
  for (const [hood, parent] of Object.entries(NEIGHBORHOOD_PARENT)) {
    if (key.includes(hood) || hood.includes(key)) return parent;
  }
  for (const [subKey, label] of Object.entries(SUBCITY_LABELS)) {
    if (key.includes(subKey) || subKey.includes(key)) return label;
  }
  return null;
}

function buildPlaceQuery(candidate) {
  const key = normalizeKey(candidate);
  if (!key || containsWrongCity(candidate)) return null;

  const parent = parentSubcityFor(candidate);
  if (parent && normalizeKey(parent) !== key) {
    return `${candidate}, ${parent}, Addis Ababa, Ethiopia`;
  }
  if (SUBCITY_LABELS[key]) {
    return `${SUBCITY_LABELS[key]}, Addis Ababa, Ethiopia`;
  }
  return `${candidate}, Addis Ababa, Ethiopia`;
}

function placeZoom(candidate) {
  if (isCanonicalSubcity(candidate)) return 13;
  if (NEIGHBORHOOD_PARENT[normalizeKey(candidate)]) return 15;
  return 14;
}

function buildStreetQuery(property) {
  const desc = [property?.description, property?.description_original, property?.title]
    .filter(Boolean)
    .join(" ");
  const streets = extractStreetMentions(desc);
  if (!streets.length) return null;

  const candidates = mapPlaceCandidates(property);
  const locality = candidates.find((c) => !containsWrongCity(c));
  const parts = [streets[0]];
  if (locality) parts.push(locality);
  parts.push("Addis Ababa", "Ethiopia");
  return [...new Set(parts.filter(Boolean))].join(", ");
}

/**
 * Resolve how to show a listing on Google Maps.
 * Uses the most precise location available (coordinates → street → neighborhood → sub-city).
 */
export function resolvePropertyMapLocation(property) {
  const lat = Number(property?.latitude);
  const lng = Number(property?.longitude);
  const preciseLabel =
    property?.location_area?.trim() ||
    property?.location_district?.trim() ||
    property?.canonical_area;

  if (isInAddisBounds(lat, lng)) {
    return {
      mode: "point",
      lat,
      lng,
      zoom: 16,
      label: preciseLabel,
      precision: "exact"
    };
  }

  const fromUrl = parseCoordsFromMapUrl(property?.google_maps_url);
  if (fromUrl) {
    return {
      mode: "point",
      lat: fromUrl.lat,
      lng: fromUrl.lng,
      zoom: 16,
      label: preciseLabel,
      precision: "exact"
    };
  }

  const streetQuery = buildStreetQuery(property);
  if (streetQuery) {
    return {
      mode: "place",
      query: streetQuery,
      zoom: 16,
      label: preciseLabel,
      precision: "street"
    };
  }

  const urlPlace = parsePlaceQueryFromMapUrl(property?.google_maps_url);
  if (urlPlace) {
    return { mode: "place", query: urlPlace, zoom: 16, label: preciseLabel, precision: "address" };
  }

  for (const candidate of mapPlaceCandidates(property)) {
    const query = buildPlaceQuery(candidate);
    if (query) {
      return {
        mode: "place",
        query,
        zoom: placeZoom(candidate),
        label: candidate,
        precision: isCanonicalSubcity(candidate) ? "subcity" : "neighborhood",
        filterArea: property?.canonical_area || null
      };
    }
  }

  return { mode: "none" };
}

export function buildGoogleMapsEmbedUrl(resolved) {
  if (!resolved || resolved.mode === "none") return null;
  const zoom = resolved.zoom ?? (resolved.mode === "point" ? 16 : 13);
  if (resolved.mode === "point") {
    return `https://www.google.com/maps?q=${resolved.lat},${resolved.lng}&z=${zoom}&output=embed`;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(resolved.query)}&z=${zoom}&output=embed`;
}

export function buildSafeMapQuery(property) {
  const candidates = mapPlaceCandidates(property);
  const parts = [];

  for (const name of candidates) {
    if (!isCanonicalSubcity(name)) {
      parts.push(name);
      break;
    }
  }
  if (!parts.length) {
    for (const name of candidates) {
      parts.push(name);
      break;
    }
  }

  parts.push("Addis Ababa", "Ethiopia");
  return [...new Set(parts.filter(Boolean))].join(", ");
}

export function getMapLocationCaption(resolved, property, t) {
  if (!resolved || resolved.mode === "none") return null;
  if (resolved.mode === "point") return null;

  const translate = typeof t === "function" ? t : (k) => k;
  const shown = resolved.label || property?.location_area;
  const filterArea = property?.canonical_area;

  if (resolved.precision === "street" || resolved.precision === "address") {
    return translate("mapCaptionPrecise");
  }
  if (shown && filterArea && normalizeKey(shown) !== normalizeKey(filterArea)) {
    return translate("mapCaptionNeighborhood", { place: shown, subcity: filterArea });
  }
  if (shown) {
    return translate("mapCaptionArea", { place: shown });
  }
  return translate("mapCaptionApproximate");
}
