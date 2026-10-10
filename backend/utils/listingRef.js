/**
 * Internal Market Mizan listing reference ("MM" + numeric properties.id).
 * Stable, source-agnostic and short enough to quote over WhatsApp or the phone.
 */
const REF_PREFIX = "MM";

function formatListingRef(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return `${REF_PREFIX}${n}`;
}

/** Accepts "MM123", "mm 123", "MM-123", "#MM123". Returns the numeric id or null. */
function parseListingRef(value) {
  const match = String(value ?? "").trim().match(/^#?mm[\s-]*(\d{1,9})$/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

module.exports = { REF_PREFIX, formatListingRef, parseListingRef };
