/** Shared display currency for map, ticker, and index widgets. */
export const CURRENCY_STORAGE_KEY = "mm-index-currency";

export function readPreferredCurrency(fallback = "USD") {
  try {
    const value = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (value === "ETB" || value === "USD") return value;
  } catch {
    /* ignore */
  }
  return fallback === "ETB" ? "ETB" : "USD";
}

export function writePreferredCurrency(currency) {
  const next = currency === "ETB" ? "ETB" : "USD";
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

/** Pick the primary display line for a listing given USD/ETB preference. */
export function pickPriceLine(lines, currency = "USD") {
  if (!lines || lines.onRequest) return lines?.label || "Price on request";
  if (currency === "ETB") return lines.etb || lines.usd || lines.label || "Price on request";
  return lines.usd || lines.etb || lines.label || "Price on request";
}
