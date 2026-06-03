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

function applyUsdPricing(record, etbPerUsd = getEtbPerUsd()) {
  const etb = record.price_etb != null ? Number(record.price_etb) : Number(record.price);
  const fxDate = record.fx_rate_date || todayIsoDate();
  const fxRate = record.fx_rate_etb_usd != null ? Number(record.fx_rate_etb_usd) : etbPerUsd;
  const usd =
    record.price_usd != null
      ? Number(record.price_usd)
      : etbToUsd(etb, fxRate);

  return {
    ...record,
    price_etb: Number.isFinite(etb) ? etb : null,
    price_usd: Number.isFinite(usd) ? usd : null,
    fx_rate_etb_usd: fxRate,
    fx_rate_date: fxDate,
    currency: "USD"
  };
}

module.exports = { getEtbPerUsd, todayIsoDate, etbToUsd, applyUsdPricing };
