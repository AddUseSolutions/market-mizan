export function isRentalListing(property) {
  const status = String(property?.property_status || "").toLowerCase();
  const mode = String(property?.listing_mode || "").toLowerCase();
  return status.includes("rent") || mode === "for_rent";
}

export function formatUsdPrice(property) {
  const usd = property?.price_usd != null ? Number(property.price_usd) : null;
  if (Number.isFinite(usd) && usd > 0) {
    const suffix = isRentalListing(property) ? "/ mo" : "";
    return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}${suffix}`;
  }
  const fallback = Number(property?.price || 0);
  if (fallback > 0) {
    return `$${fallback.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return "—";
}

export function formatEtbSecondary(property) {
  const etb = property?.price_etb != null ? Number(property.price_etb) : Number(property?.price);
  if (!Number.isFinite(etb) || etb <= 0) return null;
  const suffix = isRentalListing(property) ? "/ mo" : "";
  return `ETB ${Math.round(etb).toLocaleString("en-US")}${suffix}`;
}

export function pricePerSqm(property) {
  const usd = property?.price_usd != null ? Number(property.price_usd) : null;
  const size = Number(property?.property_size_m2);
  if (!Number.isFinite(usd) || !Number.isFinite(size) || size <= 0) return null;
  return Math.round((usd / size) * 100) / 100;
}

export function isVerifiedListing(property) {
  return String(property?.verification_status || "").toLowerCase() === "verified";
}
