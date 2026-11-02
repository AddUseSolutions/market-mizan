const { cleanTitle } = require("./cleanTitle");
const { listingModeJs } = require("./listingFilters");
const { sanitizeListingImages } = require("./sanitizeListingImages");

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function shapeMapListing(row) {
  const propertyId = String(row?.property_id || "").trim();
  if (!propertyId) return null;
  const mode = listingModeJs(row);
  const area = String(row.canonical_area || row.location_area || "").trim();
  const images = sanitizeListingImages(row.images, {
    title: row.title,
    area: area || row.location_area
  }).filter((url) => typeof url === "string" && /^https?:\/\//i.test(url));
  const lat = numberOrNull(row.latitude);
  const lng = numberOrNull(row.longitude);
  const located = lat != null && lng != null && !(lat === 0 && lng === 0);
  const priceEtb = numberOrNull(row.price_etb) ?? numberOrNull(row.price);
  return {
    property_id: propertyId,
    title: cleanTitle(row.title) || "Property",
    price_etb: priceEtb,
    price_usd: numberOrNull(row.price_usd),
    price: priceEtb,
    property_status: row.property_status || (mode === "rent" ? "For Rent" : mode === "sale" ? "For Sale" : ""),
    listing_mode: mode === "rent" ? "for_rent" : mode === "sale" ? "for_sale" : "",
    bedrooms: numberOrNull(row.bedrooms),
    latitude: located ? lat : null,
    longitude: located ? lng : null,
    area,
    location_area: String(row.location_area || "").trim(),
    images: images.slice(0, 1)
  };
}

module.exports = { shapeMapListing };
