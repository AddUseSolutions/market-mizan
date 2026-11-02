const { convertJustPropertyListingPrices } = require("./justpropertyCurrency");

/** Fallback when the live NBE pull is unavailable. Near the recent NBE USD/ETB reference. */
const DEFAULT_ETB_PER_USD = 161;
/** Free Frankfurter mirror of National Bank of Ethiopia indicative rates (no API key). */
const NBE_RATES_URL =
  process.env.FX_NBE_URL || "https://api.frankfurter.dev/v2/rates?base=USD&providers=nbe";
const REFRESH_MS = Math.max(60 * 60 * 1000, Number(process.env.FX_REFRESH_MS || 6 * 3600 * 1000) || 6 * 3600 * 1000);

let liveRate = null;
let liveRateDate = null;
let liveFetchedAt = null;
let refreshPromise = null;

function envFallbackRate() {
  const raw = process.env.FX_ETB_USD || process.env.ETB_USD_RATE || String(DEFAULT_ETB_PER_USD);
  const rate = Number(raw);
  if (!Number.isFinite(rate) || rate <= 0) return DEFAULT_ETB_PER_USD;
  // Old lock (130) is far below the current NBE USD/ETB reference (~161).
  if (rate < 150) return DEFAULT_ETB_PER_USD;
  return rate;
}

function parseNbeUsdEtb(payload) {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.rates) ? payload.rates : [];
  for (const row of rows) {
    const base = String(row?.base || "").toUpperCase();
    const quote = String(row?.quote || row?.currency || "").toUpperCase();
    const rate = Number(row?.rate ?? row?.value);
    if (base === "USD" && quote === "ETB" && Number.isFinite(rate) && rate > 50 && rate < 500) {
      return { rate, date: row?.date ? String(row.date).slice(0, 10) : null };
    }
  }
  return null;
}

/**
 * ETB per 1 USD. Prefers the cached NBE indicative rate (refreshed daily).
 * Falls back to FX_ETB_USD / DEFAULT when the live pull has not succeeded yet.
 */
function getEtbPerUsd() {
  if (Number.isFinite(liveRate) && liveRate > 0) return liveRate;
  return envFallbackRate();
}

function getFxStatus() {
  return {
    etbPerUsd: getEtbPerUsd(),
    source: liveRate != null ? "nbe" : "fallback",
    rateDate: liveRateDate,
    fetchedAt: liveFetchedAt,
    provider: "frankfurter/nbe"
  };
}

async function refreshEtbPerUsdFromNbe() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const response = await fetch(NBE_RATES_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      throw new Error(`NBE FX HTTP ${response.status}`);
    }
    const body = await response.json();
    const parsed = parseNbeUsdEtb(body);
    if (!parsed) throw new Error("NBE FX response had no USD/ETB rate");
    liveRate = Math.round(parsed.rate * 10000) / 10000;
    liveRateDate = parsed.date || todayIsoDate();
    liveFetchedAt = new Date().toISOString();
    console.log(`FX: NBE USD/ETB ${liveRate} (rate date ${liveRateDate})`);
    return getFxStatus();
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function startFxRateRefresh() {
  const run = () =>
    refreshEtbPerUsdFromNbe().catch((e) => console.error("FX refresh failed:", e.message));
  run();
  setInterval(run, REFRESH_MS).unref();
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

function isStaleJustPropertyZarUsdRate(rate) {
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) return true;
  const defaultRate = getDefaultZarUsdRate();
  if (Math.abs(r - defaultRate) < 0.0001) return true;
  return r < 0.04 || r > 0.12;
}

function resolveJustPropertyZarAmount(record) {
  const fromSource = Number(record.source_price_zar);
  if (Number.isFinite(fromSource) && fromSource > 0) return fromSource;

  const etb = Number(record.price_etb);
  const usd = Number(record.price_usd);
  const etbPerUsd = Number(record.fx_rate_etb_usd) || getEtbPerUsd();
  const zarUsd = Number(record.fx_rate_zar_usd);

  if (isCorruptJustPropertyPricing(record)) {
    if (Number.isFinite(etb) && Number.isFinite(usd) && usd > 0) {
      if (Number.isFinite(zarUsd) && zarUsd > 0) {
        const inferredZar = Math.round((usd / zarUsd) * 100) / 100;
        if (inferredZar > 0 && (!Number.isFinite(etb) || inferredZar < etb)) {
          return inferredZar;
        }
      }
      if (etb > 0 && etb < 100000) return etb;
    }
  }

  for (const key of ["price", "price_usd"]) {
    const candidate = Number(record[key]);
    if (!Number.isFinite(candidate) || candidate <= 0) continue;
    if (Number.isFinite(usd) && usd > 0 && Math.abs(candidate / usd - etbPerUsd) < 5) {
      return candidate;
    }
  }

  const fallback = Number(record.price ?? record.price_usd);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

function needsJustPropertyApiRepair(record) {
  if (!isJustPropertySource(record)) return false;

  const existingEtb = Number(record.price_etb);
  const corrupt = isCorruptJustPropertyPricing(record);
  const needsRepair =
    !Number.isFinite(existingEtb) ||
    existingEtb <= 0 ||
    corrupt;

  if (!needsRepair) return false;

  if (corrupt) return true;

  const lockedZarUsd = Number(record.fx_rate_zar_usd);
  return !(Number.isFinite(lockedZarUsd) && lockedZarUsd > 0) || isStaleJustPropertyZarUsdRate(lockedZarUsd);
}

/** Just Property: ZAR → USD (stored site rate) → ETB. Skips corrupt rows (async API handles those). */
function repairJustPropertyPricing(record) {
  if (!isJustPropertySource(record)) return record;

  const existingEtb = Number(record.price_etb);
  const needsRepair =
    !Number.isFinite(existingEtb) ||
    existingEtb <= 0 ||
    isCorruptJustPropertyPricing(record);

  if (!needsRepair) return record;

  if (isCorruptJustPropertyPricing(record)) return record;

  const zar = resolveJustPropertyZarAmount(record);
  if (!Number.isFinite(zar) || zar <= 0) return record;

  const lockedZarUsd = Number(record.fx_rate_zar_usd);
  if (!(Number.isFinite(lockedZarUsd) && lockedZarUsd > 0) || isStaleJustPropertyZarUsdRate(lockedZarUsd)) {
    return record;
  }

  const etbPerUsd = Number(record.fx_rate_etb_usd) || getEtbPerUsd();
  const usd = Math.round(zar * lockedZarUsd * 100) / 100;
  const etb = Math.round(usd * etbPerUsd * 100) / 100;

  return {
    ...record,
    source_price_zar: zar,
    price: etb,
    price_etb: etb,
    price_usd: usd,
    fx_rate_zar_usd: lockedZarUsd,
    fx_rate_etb_usd: etbPerUsd,
    fx_rate_date: record.fx_rate_date || todayIsoDate(),
    currency: "ETB"
  };
}

/** Just Property: USD from site API (same as dropdown), then ETB from USD→ETB. */
async function repairJustPropertyPricingAsync(record) {
  if (!needsJustPropertyApiRepair(record)) {
    return repairJustPropertyPricing(record);
  }

  const zar = resolveJustPropertyZarAmount(record);
  if (!Number.isFinite(zar) || zar <= 0) return record;

  const corrupt = isCorruptJustPropertyPricing(record);
  const lockedEtbPerUsd = Number(record.fx_rate_etb_usd);
  const lockedFxDate = record.fx_rate_date || null;

  try {
    const converted = await convertJustPropertyListingPrices(zar, {
      displayUsd: null,
      lockedZarUsd: null,
      lockedEtbPerUsd: corrupt ? null : (Number.isFinite(lockedEtbPerUsd) && lockedEtbPerUsd > 0 ? lockedEtbPerUsd : null),
      lockedFxDate: corrupt ? null : lockedFxDate
    });

    return {
      ...record,
      source_price_zar: zar,
      price: converted.price_etb,
      price_etb: converted.price_etb,
      price_usd: converted.price_usd,
      fx_rate_zar_usd: converted.fx_rate_zar_usd,
      fx_rate_etb_usd: converted.fx_rate_etb_usd,
      fx_rate_date: converted.fx_rate_date || record.fx_rate_date || todayIsoDate(),
      currency: "ETB"
    };
  } catch {
    return repairJustPropertyPricing(record);
  }
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

/**
 * Validate submit/publish prices. Returns { ok, message }.
 * Floors match Addis Ababa reality enough to block typos like ETB 2,500/mo rent.
 */
function validateListingPriceInput({ priceEtb, listingMode, propertyStatus } = {}) {
  const etb = Number(priceEtb);
  if (!Number.isFinite(etb) || etb <= 0) {
    return { ok: false, message: "Price must be a valid positive number." };
  }
  const status = String(propertyStatus || "").toLowerCase();
  const mode = String(listingMode || "").toLowerCase();
  const isRent =
    mode.includes("rent") ||
    status.includes("rent") ||
    status.includes("to let") ||
    status.includes("to-let");

  if (isRent) {
    if (etb < 8000) {
      return {
        ok: false,
        message:
          "Monthly rent looks too low (minimum ETB 8,000). Check the amount — typos like 2,500 instead of 25,000 damage trust."
      };
    }
    if (etb > 6_500_000) {
      return {
        ok: false,
        message: "Monthly rent looks too high. Please check the amount (ETB per month)."
      };
    }
  } else if (etb < 500_000) {
    return {
      ok: false,
      message: "Sale price looks too low (minimum ETB 500,000). Please check the amount."
    };
  }

  return { ok: true };
}

/**
 * Prefer birr → current rate for display. Stored price_usd is often locked at an old
 * FX_ETB_USD (e.g. 130) and must not win when price_etb is present.
 * Just Property keeps its ZAR-derived USD after repair.
 */
function resolveDisplayUsd(base, etb, etbPerUsd) {
  const storedUsd = Number(base.price_usd);
  if (isJustPropertySource(base) && Number.isFinite(storedUsd) && storedUsd > 0) {
    return storedUsd;
  }
  if (Number.isFinite(etb) && etb > 0) return etbToUsd(etb, etbPerUsd);
  return Number.isFinite(storedUsd) && storedUsd > 0 ? storedUsd : null;
}

function applyUsdPricing(record, etbPerUsd = getEtbPerUsd()) {
  const base = repairJustPropertyPricing(record);
  const etb = base.price_etb != null ? Number(base.price_etb) : Number(base.price);
  const fxDate = todayIsoDate();
  const fxRate = etbPerUsd;
  const usd = resolveDisplayUsd(base, etb, fxRate);

  return {
    ...base,
    price_etb: Number.isFinite(etb) ? etb : null,
    price_usd: Number.isFinite(usd) ? usd : null,
    fx_rate_etb_usd: fxRate,
    fx_rate_date: fxDate,
    currency: "ETB"
  };
}

async function applyUsdPricingAsync(record, etbPerUsd = getEtbPerUsd()) {
  const base = await repairJustPropertyPricingAsync(record);
  const etb = base.price_etb != null ? Number(base.price_etb) : Number(base.price);
  const fxDate = todayIsoDate();
  const fxRate = etbPerUsd;
  const usd = resolveDisplayUsd(base, etb, fxRate);

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
  getFxStatus,
  refreshEtbPerUsdFromNbe,
  startFxRateRefresh,
  parseNbeUsdEtb,
  getDefaultZarUsdRate,
  todayIsoDate,
  etbToUsd,
  applyUsdPricing,
  applyUsdPricingAsync,
  repairJustPropertyPricing,
  repairJustPropertyPricingAsync,
  needsJustPropertyApiRepair,
  isCorruptJustPropertyPricing,
  isPlausibleListingPrice,
  validateListingPriceInput,
  isRentalRow
};
