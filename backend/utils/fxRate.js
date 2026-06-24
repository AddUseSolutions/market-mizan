/**
 * ETB per 1 USD — e.g. 130 means 1 USD = 130 ETB.
 */
function getEtbPerUsd() {
  const raw = process.env.FX_ETB_USD || process.env.ETB_USD_RATE || "130";
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate <= 0) return 130;
  return rate;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function etbToUsd(etb, etbPerUsd = getEtbPerUsd()) {
  const n = Number(etb);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round((n / etbPerUsd) * 100) / 100;
}

function isJustPropertySource(record) {
  return String(record?.source_website || "").toLowerCase().includes("just.property");
}

function isRentalRow(record) {
  const status = String(record?.property_status || "").toLowerCase();
  const mode = String(record?.listing_mode || "").toLowerCase();
  return status.includes("rent") || status.includes("to let") || status.includes("to-let") || mode === "for_rent";
}

function getDefaultZarUsdRate() {
  const raw = process.env.FX_ZAR_USD || "0.055";
  const rate = Number(raw);
  return Number.isFinite(rate) && rate > 0 ? rate : 0.055;
}

/**
 * ZAR amount was stored as ETB and USD = ETB/130 (e.g. ETB 16,000 | $123 for R16,000 pm).
 */
function isCorruptJustPropertyPricing(record) {
  if (!isJustPropertySource(record)) return false;
  const etb = Number(record.price_etb);
  const usd = Number(record.price_usd);
  if (!Number.isFinite(etb) || etb <= 0 || !Number.isFinite(usd) || usd <= 0) return false;
  const etbPerUsd = Number(record.fx_rate_etb_usd) || getEtbPerUsd();
  const ratio = etb / usd;
  return Math.abs(ratio - etbPerUsd) < 5;
}

function resolveJustPropertyZarAmount(record) {
  const fromSource = Number(record.source_price_zar);
  if (Number.isFinite(fromSource) && fromSource > 0) return fromSource;

  if (isCorruptJustPropertyPricing(record)) {
    return Number(record.price_etb);
  }

  const etbPerUsd = Number(record.fx_rate_etb_usd) || getEtbPerUsd();
  for (const key of ["price", "price_usd"]) {
    const candidate = Number(record[key]);
    const usd = Number(record.price_usd);
    if (!Number.isFinite(candidate) || candidate <= 0) continue;
    if (Number.isFinite(usd) && usd > 0 && Math.abs(candidate / usd - etbPerUsd) < 5) {
      return candidate;
    }
  }

  const fallback = Number(record.price ?? record.price_usd);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

/** Just Property: ZAR → USD (site rate) → ETB (import-date USD/ETB). */
function repairJustPropertyPricing(record) {
  if (!isJustPropertySource(record)) return record;

  const existingEtb = Number(record.price_etb);
  const needsRepair =
    !Number.isFinite(existingEtb) ||
    existingEtb <= 0 ||
    isCorruptJustPropertyPricing(record);

  if (!needsRepair) return record;

  const zar = resolveJustPropertyZarAmount(record);
  if (!Number.isFinite(zar) || zar <= 0) return record;

  const etbPerUsd = Number(record.fx_rate_etb_usd) || getEtbPerUsd();
  const lockedZarUsd = Number(record.fx_rate_zar_usd);
  const usd =
    Number.isFinite(lockedZarUsd) && lockedZarUsd > 0
      ? Math.round(zar * lockedZarUsd * 100) / 100
      : Math.round(zar * getDefaultZarUsdRate() * 100) / 100;
  const etb = Math.round(usd * etbPerUsd * 100) / 100;

  return {
    ...record,
    source_price_zar: zar,
    price: etb,
    price_etb: etb,
    price_usd: usd,
    fx_rate_zar_usd: Number.isFinite(lockedZarUsd) && lockedZarUsd > 0 ? lockedZarUsd : getDefaultZarUsdRate(),
    fx_rate_etb_usd: etbPerUsd,
    fx_rate_date: record.fx_rate_date || todayIsoDate(),
    currency: "ETB"
  };
}

/** Reject scraper typos like $14 / ETB 14 on sale listings. */
function isPlausibleListingPrice(record) {
  const row = applyUsdPricing(record);
  const usd = Number(row.price_usd);
  const etb = Number(row.price_etb);
  if (isRentalRow(row)) {
    return (Number.isFinite(usd) && usd >= 80) || (Number.isFinite(etb) && etb >= 8000);
  }
  return (Number.isFinite(usd) && usd >= 8000) || (Number.isFinite(etb) && etb >= 500000);
}

function applyUsdPricing(record, etbPerUsd = getEtbPerUsd()) {
  const base = repairJustPropertyPricing(record);
  const etb = base.price_etb != null ? Number(base.price_etb) : Number(base.price);
  const fxDate = base.fx_rate_date || todayIsoDate();
  const fxRate = base.fx_rate_etb_usd != null ? Number(base.fx_rate_etb_usd) : etbPerUsd;
  const usd =
    base.price_usd != null
      ? Number(base.price_usd)
      : etbToUsd(etb, fxRate);

  return {
    ...base,
    price_etb: Number.isFinite(etb) ? etb : null,
    price_usd: Number.isFinite(usd) ? usd : null,
    fx_rate_etb_usd: fxRate,
    fx_rate_date: fxDate,
    currency: "ETB"
  };
}

module.exports = {
  getEtbPerUsd,
  getDefaultZarUsdRate,
  todayIsoDate,
  etbToUsd,
  applyUsdPricing,
  repairJustPropertyPricing,
  isCorruptJustPropertyPricing,
  isPlausibleListingPrice,
  isRentalRow
};
