/** Locale-aware integer formatting (e.g. 3000 → "3,000"). */
export function formatInteger(n, locale = "en-US") {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0";
  return Math.round(num).toLocaleString(locale);
}
