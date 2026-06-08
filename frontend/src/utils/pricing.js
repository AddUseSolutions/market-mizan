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

function formatUsdAmount(usd, { rental = false, decimals = 2 } = {}) {
  if (!Number.isFinite(usd) || usd <= 0) return null;
  const suffix = rental ? "/ mo" : "";
  return `$${usd.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}${suffix}`;
}

function formatEtbAmount(etb, { rental = false } = {}) {
  if (!Number.isFinite(etb) || etb <= 0) return null;
  const suffix = rental ? "/ mo" : "";
  return `ETB ${Math.round(etb).toLocaleString("en-US")}${suffix}`;
}

/** Primary display: ETB first, USD in parentheses — e.g. ETB 20,500,000 ($157,692.31) */
export function formatDisplayPrice(property, { onRequestLabel = "Price on request" } = {}) {
  if (!hasPlausiblePrice(property)) return onRequestLabel;

  const rental = isRentalListing(property);
  const etb = property?.price_etb != null ? Number(property.price_etb) : Number(property?.price);
  const usd = property?.price_usd != null ? Number(property.price_usd) : null;

  const etbStr = formatEtbAmount(etb, { rental });
  const usdStr = formatUsdAmount(usd, { rental });

  if (etbStr && usdStr) return `${etbStr} (${usdStr})`;
  if (etbStr) return etbStr;
  if (usdStr) return usdStr;
  return onRequestLabel;
}

/** @deprecated Use formatDisplayPrice — kept for gradual migration */
export function formatUsdPrice(property, options) {
  return formatDisplayPrice(property, options);
}

/** @deprecated Use formatDisplayPrice */
export function formatEtbSecondary(property) {
  if (!hasPlausiblePrice(property)) return null;
  const usd = property?.price_usd != null ? Number(property.price_usd) : null;
  if (!Number.isFinite(usd) || usd <= 0) return null;
  return formatUsdAmount(usd, { rental: isRentalListing(property) });
}

export function pricePerSqm(property) {
  if (!hasPlausiblePrice(property)) return null;
  const usd = property?.price_usd != null ? Number(property.price_usd) : null;
  const size = Number(property?.property_size_m2);
  if (!Number.isFinite(usd) || !Number.isFinite(size) || size <= 0) return null;
  return Math.round((usd / size) * 100) / 100;
}

export function formatPricePerSqm(property) {
  if (!hasPlausiblePrice(property)) return null;
  const size = Number(property?.property_size_m2);
  if (!Number.isFinite(size) || size <= 0) return null;

  const etb = property?.price_etb != null ? Number(property.price_etb) : Number(property?.price);
  const usdPps = pricePerSqm(property);
  const etbPps = Number.isFinite(etb) && etb > 0 ? Math.round((etb / size) * 100) / 100 : null;

  if (etbPps != null && usdPps != null) {
    return `ETB ${etbPps.toLocaleString("en-US")}/m² ($${usdPps.toLocaleString("en-US")}/m²)`;
  }
  if (etbPps != null) return `ETB ${etbPps.toLocaleString("en-US")}/m²`;
  if (usdPps != null) return `$${usdPps.toLocaleString("en-US")}/m²`;
  return null;
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
