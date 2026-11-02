import { getSubcityCenter, isInAddisBounds } from "./mapLocation.js";

const ADDIS = { minLat: 8.76, maxLat: 9.14, minLng: 38.56, maxLng: 39.04 };

function clamp(pos) {
  return {
    lat: Math.min(ADDIS.maxLat, Math.max(ADDIS.minLat, pos.lat)),
    lng: Math.min(ADDIS.maxLng, Math.max(ADDIS.minLng, pos.lng))
  };
}

function spiral(center, index, count) {
  if (count <= 1) return { lat: center.lat, lng: center.lng };
  const angle = index * 2.399963229728653;
  const maxRadius = Math.min(0.02, 0.0035 + Math.sqrt(count) * 0.0011);
  const radius = maxRadius * Math.sqrt((index + 0.5) / count);
  return clamp({
    lat: center.lat + Math.sin(angle) * radius,
    lng: center.lng + Math.cos(angle) * radius * 1.15
  });
}

/** Real coordinates stay put. Listings without a pin spread around their sub-city. */
export function placeListingPins(listings) {
  const groups = new Map();
  const placed = [];
  for (const listing of listings || []) {
    const lat = Number(listing.latitude);
    const lng = Number(listing.longitude);
    if (isInAddisBounds(lat, lng)) {
      placed.push({ ...listing, lat, lng, approximate: false });
      continue;
    }
    const area = listing.area || "";
    const bucket = groups.get(area) || [];
    bucket.push(listing);
    groups.set(area, bucket);
  }
  for (const [area, bucket] of groups) {
    const center = getSubcityCenter(area);
    bucket.forEach((listing, index) => {
      const pos = spiral(center, index, bucket.length);
      placed.push({ ...listing, lat: pos.lat, lng: pos.lng, approximate: true });
    });
  }
  return placed;
}

export function pinInBounds(pin, bounds) {
  if (!bounds) return true;
  return pin.lat >= bounds.south && pin.lat <= bounds.north && pin.lng >= bounds.west && pin.lng <= bounds.east;
}

/** Group nearby prices until the map is close enough to tell the homes apart. */
export function clusterPins(pins, { zoom = 12, bounds = null, selectedId = "" } = {}) {
  const visible = (pins || []).filter((pin) => pinInBounds(pin, bounds));
  const cell = zoom >= 15 ? 0 : zoom >= 14 ? 0.006 : zoom >= 13 ? 0.012 : zoom >= 12 ? 0.025 : 0.05;
  if (!cell) return visible.map((pin) => ({ type: "pin", pin, lat: pin.lat, lng: pin.lng }));

  const groups = new Map();
  for (const pin of visible) {
    const key = `${Math.floor(pin.lat / cell)}:${Math.floor(pin.lng / cell)}`;
    const list = groups.get(key) || [];
    list.push(pin);
    groups.set(key, list);
  }

  const out = [];
  for (const list of groups.values()) {
    const selected = selectedId ? list.find((pin) => pin.property_id === selectedId) : null;
    const rest = selected ? list.filter((pin) => pin.property_id !== selectedId) : list;
    if (selected) out.push({ type: "pin", pin: selected, lat: selected.lat, lng: selected.lng });
    if (rest.length === 1) out.push({ type: "pin", pin: rest[0], lat: rest[0].lat, lng: rest[0].lng });
    else if (rest.length > 1) {
      out.push({
        type: "cluster",
        lat: rest.reduce((sum, pin) => sum + pin.lat, 0) / rest.length,
        lng: rest.reduce((sum, pin) => sum + pin.lng, 0) / rest.length,
        count: rest.length,
        pins: rest
      });
    }
  }
  return out;
}

export function formatPinPrice(listing) {
  const usd = Number(listing?.price_usd);
  if (Number.isFinite(usd) && usd > 0) return compactMoney(usd, "$");
  const etb = Number(listing?.price_etb ?? listing?.price);
  if (Number.isFinite(etb) && etb > 0) return compactMoney(etb, "ETB ");
  return "—";
}

function compactMoney(amount, prefix) {
  if (amount >= 1_000_000) {
    const value = amount / 1_000_000;
    const digits = value >= 10 ? 0 : 1;
    return `${prefix}${value.toFixed(digits)}M`;
  }
  if (amount >= 1000) return `${prefix}${Math.round(amount / 1000)}K`;
  return `${prefix}${Math.round(amount)}`;
}
