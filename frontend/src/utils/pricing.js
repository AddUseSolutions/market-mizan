export function isRentalListing(property) {
  const status = String(property?.property_status || "").toLowerCase();
  const mode = String(property?.listing_mode || "").toLowerCase();
  return status.includes("rent") || mode === "for_rent";
}

/** Hide obvious scraper/parse errors (e.g. $14 sale listings). */
export function hasPlausiblePrice(property) {
  const usd = property?.price_usd != null ? Number(property.price_usd) : Number(property?.price);
  const etb = property?.price_etb != null ? Number(property.price_etb) : Number(property?.price);
  if (isRentalListing(property)) {
    return (Number.isFinite(usd) && usd >= 80) || (Number.isFinite(etb) && etb >= 8000);
  }
  return (Number.isFinite(usd) && usd >= 8000) || (Number.isFinite(etb) && etb >= 500000);
}

export function formatUsdPrice(property, { onRequestLabel = "Price on request" } = {}) {
  if (!hasPlausiblePrice(property)) return onRequestLabel;
  const usd = property?.price_usd != null ? Number(property.price_usd) : null;
  if (Number.isFinite(usd) && usd > 0) {
    const suffix = isRentalListing(property) ? "/ mo" : "";
    return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}${suffix}`;
  }
  const fallback = Number(property?.price || 0);
  if (fallback > 0 && hasPlausiblePrice({ ...property, price_usd: fallback })) {
    return `$${fallback.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return onRequestLabel;
}

export function formatEtbSecondary(property) {
  if (!hasPlausiblePrice(property)) return null;
  const etb = property?.price_etb != null ? Number(property.price_etb) : Number(property?.price);
  if (!Number.isFinite(etb) || etb <= 0) return null;
  const suffix = isRentalListing(property) ? "/ mo" : "";
  return `ETB ${Math.round(etb).toLocaleString("en-US")}${suffix}`;
}

export function pricePerSqm(property) {
  if (!hasPlausiblePrice(property)) return null;
  const usd = property?.price_usd != null ? Number(property.price_usd) : null;
  const size = Number(property?.property_size_m2);
  if (!Number.isFinite(usd) || !Number.isFinite(size) || size <= 0) return null;
  return Math.round((usd / size) * 100) / 100;
}

export function isVerifiedListing(property) {
  return String(property?.verification_status || "").toLowerCase() === "verified";
}

export function formatSyncedShort(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return null;
  }
}
