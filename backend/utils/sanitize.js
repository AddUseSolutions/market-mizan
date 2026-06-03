function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim();
}

function clampString(value, max) {
  return stripHtml(value).slice(0, max);
}

function clampEmail(value) {
  const e = String(value || "").trim().toLowerCase().slice(0, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : "";
}

function clampNumber(value, { min = null, max = null } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (min != null && n < min) return null;
  if (max != null && n > max) return null;
  return n;
}

function slugPropertyId(prefix = "mm") {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`.slice(0, 50);
}

module.exports = { stripHtml, clampString, clampEmail, clampNumber, slugPropertyId };
