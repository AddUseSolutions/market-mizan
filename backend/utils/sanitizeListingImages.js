/**
 * Clean listing gallery URLs: drop map pins, broker headshots,
 * site chrome, and tiny thumbs; keep one best-resolution URL per image.
 */

const MAX_IMAGES = 6;

/** Recurring Houzez agent headshots seen across RealEthio / EthiopiaRealty. */
const KNOWN_AGENT_FILE_RE =
  /masre-portfolio|\/leul\.jpg|IMG_20220825_184149_891|\/agents?\//i;

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

function fileBase(url) {
  try {
    const file = decodeURIComponent(String(url).split("/").pop() || "");
    return file
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/-\d+x\d+$/i, "")
      .trim();
  } catch {
    return "";
  }
}

function uploadFolder(url) {
  const m = String(url).match(/\/uploads\/(\d{4}\/\d{2})\//i);
  return m ? m[1] : null;
}

function looksLikeCameraDump(base) {
  // Phone camera dumps often reused as Houzez agent portraits (not listing photos).
  // Do NOT match generic photo_… listing filenames.
  return /^(IMG|DSC|DCIM|PXL|MVIMG)[_-]?\d/i.test(base || "");
}

function looksLikePersonNameFile(base) {
  return /^[a-z]{2,14}(?:[-_][a-z]{2,14})?$/i.test(base || "");
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
  const low = String(url).toLowerCase();
  return /\/maps\//i.test(low) || /\/img\/map\//i.test(low) || /pin-single/i.test(low);
}

function isJunkImage(url) {
  const low = String(url).toLowerCase();
  if (!low) return true;
  if (isMapScreenshot(low)) return true;
  // Theme assets / map markers / site chrome (never property photos)
  if (/\/wp-content\/themes\//i.test(low) || /\/img\/map\//i.test(low)) return true;
  if (KNOWN_AGENT_FILE_RE.test(low)) return true;
  if (
    /logo|avatar|icon|favicon|placeholder|sprite|badge|google-play|app-store|play-store|dashboard|lightbox-logo/i.test(
      low
    )
  ) {
    return true;
  }
  // Broker / agent profile photos (RealEthio / EthiopiaRealty Houzez sidebar etc.)
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

/**
 * Drop agent headshots that leaked into galleries:
 * - short first-name files (leul.jpg) next to property-named clusters
 * - phone camera dumps (IMG_…) from a minority upload month
 */
function dropAgentOutliers(urls) {
  if (!Array.isArray(urls) || urls.length < 2) return urls;

  const items = urls.map((url) => {
    const base = fileBase(url);
    const core = base.toLowerCase().replace(/-\d+$/, "");
    const folder = uploadFolder(url);
    return { url, base, core, folder };
  });

  // Majority WordPress upload folder (YYYY/MM) = the real listing set.
  const folderFreq = new Map();
  for (const it of items) {
    if (!it.folder) continue;
    folderFreq.set(it.folder, (folderFreq.get(it.folder) || 0) + 1);
  }
  let bestFolder = null;
  let bestFolderN = 0;
  for (const [folder, n] of folderFreq) {
    if (n > bestFolderN) {
      bestFolder = folder;
      bestFolderN = n;
    }
  }

  if (bestFolder && bestFolderN >= 2) {
    return items
      .filter((it) => {
        if (!it.folder || it.folder === bestFolder) return true;
        // Minority folder: drop camera dumps / person-name files / short leftovers.
        if (looksLikeCameraDump(it.base) || looksLikePersonNameFile(it.base)) return false;
        if (it.base.length < 28) return false;
        return true;
      })
      .map((it) => it.url);
  }

  // Filename cluster (e.g. G1-Residential-House-…-1.jpg)
  if (items.length < 3) return urls;
  const freq = new Map();
  for (const it of items) {
    if (it.core.length < 18) continue;
    freq.set(it.core, (freq.get(it.core) || 0) + 1);
  }
  let bestCore = null;
  let bestN = 0;
  for (const [core, n] of freq) {
    if (n > bestN || (n === bestN && core.length > (bestCore || "").length)) {
      bestCore = core;
      bestN = n;
    }
  }
  if (!bestCore || bestN < 2) return urls;

  const prefix = bestCore.slice(0, Math.min(28, bestCore.length));
  return items
    .filter((it) => {
      if (it.core.startsWith(prefix) || it.core.includes(prefix.slice(0, 20))) return true;
      if (looksLikeCameraDump(it.base) || looksLikePersonNameFile(it.base)) return false;
      if (it.base.length >= 28) return true;
      return false;
    })
    .map((it) => it.url);
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
  const urls = dropAgentOutliers(parseImages(raw).filter((u) => !isJunkImage(u)));
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
  isJunkImage,
  dropAgentOutliers
};
