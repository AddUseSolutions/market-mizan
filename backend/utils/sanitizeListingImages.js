/**
 * Clean listing gallery URLs: drop map screenshots, broker headshots,
 * site chrome, and tiny thumbs; keep one best-resolution URL per image.
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
  const s = String(url);
  const jp = s.match(/_t_w_(\d+)/i) || s.match(/[?&]w=(\d+)/i);
  if (jp) return Number(jp[1]);
  const wp = s.match(/-(\d+)x(\d+)(?=\.[a-z]{3,4}(?:$|\?))/i);
  if (wp) return Number(wp[1]);
  return 0;
}

function imageKey(url) {
  const s = String(url);
  // Just Property CDN uses a 32-char hex id per photo
  const hash = s.match(/([a-f0-9]{32})/i);
  if (hash) return hash[1].toLowerCase();
  // WordPress sized variants of the same file
  return s
    .replace(/-\d+x\d+(?=\.[a-z]{3,4}(?:$|\?))/i, "")
    .replace(/_t_w_\d+_h_\d+/i, "")
    .replace(/\?.*$/, "")
    .toLowerCase();
}

function isMapScreenshot(url) {
  return /\/maps\//i.test(String(url));
}

function isJunkImage(url) {
  const low = String(url).toLowerCase();
  if (!low) return true;
  if (isMapScreenshot(low)) return true;
  // Site chrome, app badges, logos
  if (
    /logo|avatar|icon|favicon|placeholder|sprite|badge|google-play|app-store|play-store|dashboard|lightbox-logo/i.test(
      low
    )
  ) {
    return true;
  }
  // Broker / agent profile photos (RealEthio Houzez sidebar etc.)
  if (/portfolio|agent[-_]?image|agent[-_]?photo|author[-_]?photo|team[-_]?member/i.test(low)) {
    return true;
  }
  // WordPress crop thumbs used for avatars (e.g. masre-portfolio-150x150.jpg)
  const wp = low.match(/-(\d+)x(\d+)(?=\.[a-z]{3,4}(?:$|\?))/i);
  if (wp) {
    const w = Number(wp[1]);
    const h = Number(wp[2]);
    if ((w > 0 && w <= 220) || (h > 0 && h <= 220)) return true;
  }
  const w = widthFromUrl(low);
  if (w > 0 && w < 400 && !/-\d+x\d+/i.test(low)) return true; // tiny JP thumbs
  return false;
}

function scoreUrl(url) {
  const w = widthFromUrl(url);
  // Prefer full-size WP URLs (no -WxH) and ~1080 gallery sizes
  const hasWpCrop = /-\d+x\d+(?=\.[a-z]{3,4}(?:$|\?))/i.test(url);
  const sizeScore = !hasWpCrop && w === 0 ? 5000 : w >= 800 ? w : w > 0 ? w / 10 : 500;
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
