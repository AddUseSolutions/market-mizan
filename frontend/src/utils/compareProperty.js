import { formatFurnishedStatus } from "./furnished";
import {
  formatLivingArea,
  formatPricePerSqm,
  getPriceLines,
  hasPlausiblePrice,
  isRentalListing,
  isVerifiedListing
} from "./pricing";
import { cleanTitle } from "./cleanTitle";

export function listingModeKey(property) {
  return isRentalListing(property) ? "for_rent" : "for_sale";
}

export function modesCompatible(a, b) {
  if (!a || !b) return true;
  return listingModeKey(a) === listingModeKey(b);
}

function formatLandArea(property) {
  const n = Number(property?.land_area_m2);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${Math.round(n).toLocaleString("en-US")} m²`;
}

function formatHmlo(property, t) {
  const score = property?.hmlo_score;
  if (score == null || Number.isNaN(Number(score))) return "—";
  const n = Number(score);
  if (n >= 70) return t("hmloHigh");
  if (n >= 40) return t("hmloMedium");
  return t("hmloLow");
}

/** Rows for side-by-side compare table (same order for both columns). */
export function buildCompareRows(property, t) {
  const priceLines = getPriceLines(property, { onRequestLabel: t("priceOnRequest") });
  const pricePrimary =
    priceLines.onRequest
      ? t("priceOnRequest")
      : [priceLines.etb, priceLines.usd].filter(Boolean).join(" · ");

  return [
    {
      key: "listingMode",
      label: t("compareRowMode"),
      value: isRentalListing(property) ? t("forRent") : t("forSale")
    },
    {
      key: "price",
      label: t("detailPrice"),
      value: pricePrimary,
      highlight: hasPlausiblePrice(property) ? "price" : null
    },
    {
      key: "pricePerSqm",
      label: t("detailPricePerSqm"),
      value: formatPricePerSqm(property)?.replace("\n", " · ") || "—",
      highlight: hasPlausiblePrice(property) ? "pricePerSqm" : null
    },
    {
      key: "bedrooms",
      label: t("bedrooms"),
      value: property?.bedrooms != null && property.bedrooms !== "" ? String(property.bedrooms) : "—"
    },
    {
      key: "bathrooms",
      label: t("baths"),
      value: property?.bathrooms != null && property.bathrooms !== "" ? String(property.bathrooms) : "—"
    },
    {
      key: "livingArea",
      label: t("livingArea"),
      value: formatLivingArea(property) || "—",
      highlight: "size"
    },
    {
      key: "landArea",
      label: t("detailLandArea"),
      value: formatLandArea(property)
    },
    {
      key: "furnished",
      label: t("furnishedLabel"),
      value: formatFurnishedStatus(property, t)
    },
    {
      key: "propertyType",
      label: t("detailObjectType"),
      value: property?.property_type?.trim() || "—"
    },
    {
      key: "location",
      label: t("searchArea"),
      value:
        [property?.location_area, property?.location_district].filter(Boolean).join(" · ") || "—"
    },
    {
      key: "hmlo",
      label: t("compareRowHmlo"),
      value: formatHmlo(property, t)
    },
    {
      key: "verified",
      label: t("verified"),
      value: isVerifiedListing(property) ? t("compareYes") : t("compareNo")
    },
    {
      key: "source",
      label: t("detailSource"),
      value: property?.source_name?.trim() || property?.source_website || "—"
    }
  ];
}

export function displayCompareTitle(property) {
  const raw = cleanTitle(String(property?.title || "").trim());
  if (raw && !/^Listing\s/i.test(raw)) return raw;
  return property?.property_id ? `Listing ${property.property_id}` : "Property";
}

export function pickBetterValue(rowKey, left, right) {
  if (!left || !right) return null;

  if (rowKey === "price" || rowKey === "pricePerSqm") {
    const lu = Number(left.price_usd ?? left.price);
    const ru = Number(right.price_usd ?? right.price);
    if (!Number.isFinite(lu) || !Number.isFinite(ru) || lu === ru) return null;
    return isRentalListing(left) ? (lu < ru ? "left" : "right") : lu < ru ? "left" : "right";
  }

  if (rowKey === "livingArea") {
    const ls = Number(left.property_size_m2);
    const rs = Number(right.property_size_m2);
    if (!Number.isFinite(ls) || !Number.isFinite(rs) || ls === rs) return null;
    return ls > rs ? "left" : "right";
  }

  return null;
}
