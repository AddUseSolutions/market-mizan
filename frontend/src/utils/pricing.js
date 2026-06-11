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

const INTEGER_FORMAT = { maximumFractionDigits: 0, minimumFractionDigits: 0 };

function rentalPeriodSuffix(rental) {
  return rental ? " / monthly rent" : "";
}

function formatUsdAmount(usd, { rental = false } = {}) {
  if (!Number.isFinite(usd) || usd <= 0) return null;
  const suffix = rentalPeriodSuffix(rental);
  return `$${Math.round(usd).toLocaleString("en-US", INTEGER_FORMAT)}${suffix}`;
}

function formatEtbAmount(etb, { rental = false } = {}) {
  if (!Number.isFinite(etb) || etb <= 0) return null;
  const suffix = rentalPeriodSuffix(rental);
  return `ETB ${Math.round(etb).toLocaleString("en-US", INTEGER_FORMAT)}${suffix}`;
}

/** ETB + USD lines for stacked display (no parentheses). */
export function getPriceLines(property, { onRequestLabel = "Price on request" } = {}) {
  if (!hasPlausiblePrice(property)) {
    return { onRequest: true, label: onRequestLabel };
  }

  const rental = isRentalListing(property);
  const etb = property?.price_etb != null ? Number(property.price_etb) : Number(property?.price);
  const usd = property?.price_usd != null ? Number(property.price_usd) : null;

  return {
    onRequest: false,
    etb: formatEtbAmount(etb, { rental }),
    usd: formatUsdAmount(usd, { rental })
  };
}

/** Plain-text fallback (ETB line, then USD line). */
export function formatDisplayPrice(property, { onRequestLabel = "Price on request" } = {}) {
  const lines = getPriceLines(property, { onRequestLabel });
  if (lines.onRequest) return onRequestLabel;
  if (lines.etb && lines.usd) return `${lines.etb}\n${lines.usd}`;
  return lines.etb || lines.usd || onRequestLabel;
}

export function formatUsdPrice(property, options) {
  return formatDisplayPrice(property, options);
}

export function formatEtbSecondary(property) {
  const lines = getPriceLines(property);
  return lines.usd || null;
}

export function pricePerSqm(property) {
  if (!hasPlausiblePrice(property)) return null;
  const usd = property?.price_usd != null ? Number(property.price_usd) : null;
  const size = Number(property?.property_size_m2);
  if (!Number.isFinite(usd) || !Number.isFinite(size) || size <= 0) return null;
  return Math.round(usd / size);
}

export function formatPricePerSqm(property) {
  if (!hasPlausiblePrice(property)) return null;
  const size = Number(property?.property_size_m2);
  if (!Number.isFinite(size) || size <= 0) return null;

  const etb = property?.price_etb != null ? Number(property.price_etb) : Number(property?.price);
  const usdPps = pricePerSqm(property);
  const etbPps = Number.isFinite(etb) && etb > 0 ? Math.round(etb / size) : null;

  if (etbPps != null && usdPps != null) {
    return `ETB ${etbPps.toLocaleString("en-US", INTEGER_FORMAT)}/m²\n$${usdPps.toLocaleString("en-US", INTEGER_FORMAT)}/m²`;
  }
  if (etbPps != null) return `ETB ${etbPps.toLocaleString("en-US", INTEGER_FORMAT)}/m²`;
  if (usdPps != null) return `$${usdPps.toLocaleString("en-US", INTEGER_FORMAT)}/m²`;
  return null;
}

export function formatLivingArea(property) {
  const size = Number(property?.property_size_m2);
  if (!Number.isFinite(size) || size <= 0) return null;
  return Math.round(size).toLocaleString("en-US", INTEGER_FORMAT);
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
