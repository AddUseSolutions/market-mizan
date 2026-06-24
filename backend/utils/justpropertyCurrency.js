/**
 * just.property live FX — same API the React currency dropdown uses.
 */

const CURRENCY_API =
  process.env.JUSTPROPERTY_CURRENCY_API ||
  "https://tuhqtbfkx8.execute-api.us-east-1.amazonaws.com/staging/currency-converter";

function timestampToDate(ts) {
  try {
    return new Date(Number(ts) * 1000).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function apiGet(amount, fromCcy, toCcy) {
  const url = new URL(CURRENCY_API);
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("from", fromCcy.toUpperCase());
  url.searchParams.set("to", toCcy.toUpperCase());

  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
  if (!resp.ok) {
    throw new Error(`currency API ${resp.status}: ${await resp.text()}`);
  }
  const data = await resp.json();
  if (!data || typeof data !== "object") {
    throw new Error(`unexpected currency API response: ${String(data)}`);
  }
  return data;
}

/**
 * USD from site dropdown/API (ZAR→USD), then ETB from that USD (USD→ETB).
 */
async function convertJustPropertyListingPrices(
  zarAmount,
  { displayUsd = null, lockedZarUsd = null, lockedEtbPerUsd = null, lockedFxDate = null } = {}
) {
  const zar = Number(zarAmount);
  if (!Number.isFinite(zar) || zar <= 0) {
    throw new Error("zarAmount must be positive");
  }

  if (lockedZarUsd != null && lockedEtbPerUsd != null) {
    const zarUsd = Number(lockedZarUsd);
    const etbPerUsd = Number(lockedEtbPerUsd);
    const usd =
      displayUsd != null && Number(displayUsd) > 0
        ? Math.round(Number(displayUsd) * 100) / 100
        : Math.round(zar * zarUsd * 100) / 100;
    const etb = Math.round(usd * etbPerUsd * 100) / 100;
    return {
      price_usd: usd,
      price_etb: etb,
      fx_rate_zar_usd: zarUsd,
      fx_rate_etb_usd: etbPerUsd,
      fx_rate_date: lockedFxDate,
      source_price_zar: zar
    };
  }

  let fxDate = null;
  let zarUsdRate = null;
  let usd;

  if (displayUsd != null && Number(displayUsd) > 0) {
    usd = Math.round(Number(displayUsd) * 100) / 100;
  } else {
    const usdData = await apiGet(zar, "ZAR", "USD");
    usd = Math.round(Number(usdData.converted || 0) * 100) / 100;
    zarUsdRate = Number(usdData.rate) || (zar > 0 ? usd / zar : null);
    fxDate = timestampToDate(usdData.timestamp);
  }

  const etbData = await apiGet(usd, "USD", "ETB");
  const etb = Math.round(Number(etbData.converted || 0) * 100) / 100;
  const etbPerUsd = Number(etbData.rate) || 0;
  if (!fxDate) fxDate = timestampToDate(etbData.timestamp);
  if (zarUsdRate == null && zar > 0) zarUsdRate = usd / zar;

  return {
    price_usd: usd,
    price_etb: etb,
    fx_rate_zar_usd: zarUsdRate,
    fx_rate_etb_usd: etbPerUsd,
    fx_rate_date: fxDate,
    source_price_zar: zar
  };
}

module.exports = {
  convertJustPropertyListingPrices
};
