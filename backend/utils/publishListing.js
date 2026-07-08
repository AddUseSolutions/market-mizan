const { query } = require("../db/connection");
const { getEtbPerUsd, todayIsoDate, etbToUsd } = require("./fxRate");
const { slugPropertyId, clampString } = require("./sanitize");
const { computePricePerSqmUsd } = require("./hmlo");
const { resolveCanonicalAreaOrDefault } = require("./canonicalAreas");

function listingModeToStatus(mode) {
  return String(mode).toLowerCase() === "for_sale" ? "For Sale" : "For Rent";
}

function typeLabel(type) {
  return String(type || "property").replace(/_/g, " ");
}

function parseImages(raw) {
  let images = raw;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [];
    }
  }
  return Array.isArray(images) ? images : [];
}

async function publishVerifiedListing(sub, { ownerId = null, publisherType = "broker", isPaid = false } = {}) {
  const propertyId = slugPropertyId("verified");
  const etbPerUsd = getEtbPerUsd();
  const priceEtb = Number(sub.price_etb || sub.price);
  const priceUsd = sub.price_usd != null ? Number(sub.price_usd) : etbToUsd(priceEtb, etbPerUsd);
  const fxDate = sub.fx_rate_date || todayIsoDate();
  const images = parseImages(sub.images);

  const descriptionOriginal =
    sub.description_original ||
    sub.notes ||
    `${listingModeToStatus(sub.listing_mode)} ${typeLabel(sub.property_type)} in ${sub.location_area || "Addis Ababa"}.`;
  const descriptionSummary = sub.description_summary || sub.ai_description || null;

  const pps = computePricePerSqmUsd({ price_usd: priceUsd, property_size_m2: sub.size_m2 });
  const canonicalArea = resolveCanonicalAreaOrDefault({
    location_area: sub.location_area,
    location_district: sub.location_area,
    title: sub.title,
    description: descriptionOriginal
  });

  await query(
    `INSERT INTO properties (
      property_id, source_website, source_name, title, price, price_etb, price_usd,
      fx_rate_etb_usd, fx_rate_date, currency, property_size_m2, land_area_m2,
      bedrooms, bathrooms, property_type, property_status, furnished, features, images,
      latitude, longitude, location_city, location_area, location_district, canonical_area,
      description, description_original, description_summary,
      is_scraped, listing_origin, verification_status, is_paid, publisher_type, owner_id,
      verified_at, price_per_sqm_usd, hmlo_score, is_active, first_seen, last_seen, scraped_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, TRUE, NOW(), NOW(), NOW())`,
    [
      propertyId,
      "market-mizan.com",
      "Market Mizan",
      sub.title,
      priceEtb,
      priceEtb,
      priceUsd,
      sub.fx_rate_etb_usd || etbPerUsd,
      fxDate,
      "USD",
      sub.size_m2,
      sub.land_area_m2,
      sub.bedrooms || sub.rooms,
      sub.bathrooms,
      typeLabel(sub.property_type),
      listingModeToStatus(sub.listing_mode),
      false,
      "[]",
      JSON.stringify(images.slice(0, 6)),
      sub.latitude,
      sub.longitude,
      sub.location_city || "Addis Ababa",
      sub.location_area,
      sub.location_area,
      canonicalArea,
      descriptionOriginal,
      descriptionOriginal,
      descriptionSummary,
      false,
      "verified",
      "verified",
      isPaid,
      clampString(publisherType, 20) || "broker",
      ownerId,
      pps,
      pps ? "medium" : null
    ]
  );

  await query(`INSERT INTO price_history (property_id, price_etb, price_usd) VALUES (?, ?, ?)`, [
    propertyId,
    priceEtb,
    priceUsd
  ]);

  return propertyId;
}

module.exports = { publishVerifiedListing, listingModeToStatus, typeLabel };
