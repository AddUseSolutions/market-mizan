/**
 * Clean listing gallery URLs: drop map screenshots / tiny thumbs,
 * keep one best-resolution URL per image hash.
 */

const MAX_IMAGES = 6;

function parseImages(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((u) => typeof u === "string" && u.trim());
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((u) => typeof u === "string" && u.trim()) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function widthFromUrl(url) {
  const m = String(url).match(/_t_w_(\d+)/i) || String(url).match(/[?&]w=(\d+)/i);
  return m ? Number(m[1]) : 0;
}

function imageKey(url) {
  const s = String(url);
  // Just Property CDN uses a 32-char hex id per photo
  const hash = s.match(/([a-f0-9]{32})/i);
  if (hash) return hash[1].toLowerCase();
  return s.replace(/_t_w_\d+_h_\d+/i, "").replace(/\?.*$/, "").toLowerCase();
}

function isMapScreenshot(url) {
  return /\/maps\//i.test(String(url));
}

function isJunkImage(url) {
  const low = String(url).toLowerCase();
  if (!low) return true;
  if (isMapScreenshot(low)) return true;
  if (/logo|avatar|icon|favicon|placeholder|sprite/i.test(low)) return true;
  const w = widthFromUrl(low);
  if (w > 0 && w < 400) return true; // tiny thumbs
  return false;
}

function scoreUrl(url) {
  const w = widthFromUrl(url);
  // Prefer ~1080/1280 gallery sizes, not tiny and not absurd
  const sizeScore = w >= 800 ? w : w > 0 ? w / 10 : 500;
  const residentialBonus = /\/residential\//i.test(url) ? 10000 : 0;
  return residentialBonus + sizeScore;
}

/**
 * @param {unknown} raw
 * @param {{ max?: number }} [opts]
 * @returns {string[]}
 */
function sanitizeListingImages(raw, opts = {}) {
  const max = opts.max ?? MAX_IMAGES;
  const urls = parseImages(raw).filter((u) => !isJunkImage(u));
  const bestByKey = new Map();

  for (const url of urls) {
    const key = imageKey(url);
    const prev = bestByKey.get(key);
    if (!prev || scoreUrl(url) > scoreUrl(prev)) {
      bestByKey.set(key, url);
    }
  }

  return [...bestByKey.values()]
    .sort((a, b) => scoreUrl(b) - scoreUrl(a))
    .slice(0, max);
}

module.exports = {
  sanitizeListingImages,
  parseImages,
  isMapScreenshot,
  isJunkImage
};
