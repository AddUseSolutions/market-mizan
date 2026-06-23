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

export function allModesCompatible(properties) {
  if (!properties?.length) return true;
  const first = listingModeKey(properties[0]);
  return properties.every((p) => listingModeKey(p) === first);
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
  const idx = pickBestIndex(rowKey, [left, right]);
  if (idx === 0) return "left";
  if (idx === 1) return "right";
  return null;
}

/** Index of the best value among properties, or null if tied / not comparable. */
export function pickBestIndex(rowKey, properties) {
  if (!properties?.length || properties.length < 2) return null;

  if (rowKey === "price" || rowKey === "pricePerSqm") {
    const values = properties.map((p) => Number(p.price_usd ?? p.price));
    if (!values.every(Number.isFinite)) return null;
    const best = Math.min(...values);
    const winners = values.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
    return winners.length === 1 ? winners[0] : null;
  }

  if (rowKey === "livingArea") {
    const values = properties.map((p) => Number(p.property_size_m2));
    if (!values.every(Number.isFinite)) return null;
    const best = Math.max(...values);
    const winners = values.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
    return winners.length === 1 ? winners[0] : null;
  }

  return null;
}
