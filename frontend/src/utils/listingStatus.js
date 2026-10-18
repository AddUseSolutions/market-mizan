import { isRentalListing } from "./pricing.js";

/**
 * Listing intent (rent vs sale) — what scrapers store in property_status today.
 * Availability (Active / Rented / Vacant / Sold) is separate and only shown when detectable.
 */

export function getListingModeLabel(property, t) {
  return isRentalListing(property) ? t("forRent") : t("forSale");
}

/**
 * Infer availability from free-text status / title when present.
 * Public feed only shows active listings, so default is Available.
 */
export function getAvailabilityKey(property) {
  const raw = `${property?.property_status || ""} ${property?.title || ""}`.toLowerCase();
  if (/\bsold\b|ተሽጧል|gurgurame/.test(raw)) return "statusSold";
  if (/\balready rented\b|\brented\b|\bleased\b|ተከራይቷል|kireeffame/.test(raw)) return "statusRented";
  if (/\bvacant\b|ባዶ|duwwaa/.test(raw)) return "statusVacant";
  if (/\binactive\b|\bexpired\b|\boff market\b/.test(raw)) return "statusSold";
  if (property?.is_active === false) return "statusSold";
  return "statusAvailable";
}

export function getAvailabilityLabel(property, t) {
  return t(getAvailabilityKey(property));
}
