const { query, dialect } = require("../db/connection");
const { sanitizeListingImages, parseImages, isJunkImage } = require("./sanitizeListingImages");

const MAX_IMAGES = 12;
const FETCH_TIMEOUT_MS = 45000;
const SLEEP_MS = 700;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasJunkGallery(raw) {
  const list = parseImages(raw);
  if (!list.length) return false;
  if (list.some((u) => isJunkImage(u))) return true;
  // Also treat agent outliers (e.g. IMG_ headshot in minority upload month) as junk.
  const cleaned = sanitizeListingImages(list, { max: 100 });
  return cleaned.length < list.length;
}

function absolutize(src, origin = "https://realethio.com") {
  const s = String(src || "")
    .trim()
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&");
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  try {
    return new URL(s, origin).href;
  } catch {
    return null;
  }
}

function wpArea(url) {
  const m = String(url).match(/-(\d+)x(\d+)(?=\.[a-z]{3,4}(?:$|\?))/i);
  if (!m) return 1e12; // full-size preferred
  return Number(m[1]) * Number(m[2]);
}

function imageKey(url) {
  return String(url)
    .replace(/-\d+x\d+(?=\.[a-z]{3,4}(?:$|\?))/i, "")
    .replace(/\?.*$/, "")
    .toLowerCase();
}

function isUsablePropertyUrl(url) {
  const low = String(url || "").toLowerCase();
  if (!low.includes("/wp-content/uploads/")) return false;
  if (!/\.(jpe?g|png|webp|avif)(\?|$)/i.test(low)) return false;
  if (isJunkImage(low)) return false;
  return true;
}

/**
 * Extract property gallery URLs from a Houzez/RealEthio detail page.
 * Prefers houzez-gallery / lightbox slides; never pulls agent sidebar photos.
 */
function extractRealEthioImagesFromHtml(html, detailUrl = "https://realethio.com/") {
  const text = String(html || "");
  const origin = (() => {
    try {
      return new URL(detailUrl).origin;
    } catch {
      return "https://realethio.com";
    }
  })();
  const bestByKey = new Map();

  function consider(raw) {
    const abs = absolutize(raw, origin);
    if (!abs || !isUsablePropertyUrl(abs)) return;
    const key = imageKey(abs);
    const prev = bestByKey.get(key);
    if (!prev || wpArea(abs) > wpArea(prev)) {
      bestByKey.set(key, abs);
    }
  }

  // Gallery / lightbox image tags (property photos).
  const galleryImgRe =
    /<(?:img|source)[^>]*(?:class=["'][^"']*(?:houzez-gallery|lightbox|top-gallery|property-gallery|gallery-featured)[^"']*["'][^>]*|[^>]*(?:houzez-gallery|lightbox-slider|top-gallery-section)[^>]*)[^>]*>/gi;
  let m;
  while ((m = galleryImgRe.exec(text))) {
    const tag = m[0];
    for (const attr of ["data-large_image", "data-src", "data-lazy-src", "data-original", "src", "href"]) {
      const am = tag.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"));
      if (am) consider(am[1]);
    }
  }

  // Lightbox / gallery anchors to full-size uploads.
  const anchorRe =
    /<a[^>]+href=["']([^"']*\/wp-content\/uploads\/[^"']+\.(?:jpe?g|png|webp|avif)[^"']*)["'][^>]*>/gi;
  while ((m = anchorRe.exec(text))) {
    // Skip agent box + related-listing rails.
    const idx = m.index;
    const window = text.slice(Math.max(0, idx - 280), idx + 80).toLowerCase();
    if (
      /agent-details|agent-image|property-form|author-box|mobile-property-contact|listing-thumb|listing-image-wrap/.test(
        window
      )
    ) {
      continue;
    }
    consider(m[1]);
  }

  // og:image as last resort (usually the hero property photo).
  const og =
    text.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i) ||
    text.match(/content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i);
  if (og?.[1]) consider(og[1]);

  return sanitizeListingImages([...bestByKey.values()], { max: MAX_IMAGES });
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        // Browser-like headers — RealEthio/Cloudflare often 403s bot UAs from cloud IPs.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Referer: "https://realethio.com/"
      },
      redirect: "follow"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function updateImages(propertyId, images) {
  const payload = JSON.stringify(images);
  if (dialect === "postgres") {
    await query(`UPDATE properties SET images = CAST(? AS jsonb) WHERE property_id = ?`, [payload, propertyId]);
  } else {
    await query(`UPDATE properties SET images = ? WHERE property_id = ?`, [payload, propertyId]);
  }
}

async function listRealEthioForRepair({ limit = 25, force = false, propertyIds = [] } = {}) {
  const ids = (propertyIds || []).map((x) => String(x).trim()).filter(Boolean);
  const lim = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 25;

  if (ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await query(
      `SELECT property_id, detail_url, images
       FROM properties
       WHERE property_id IN (${placeholders})
         AND is_active = TRUE
         AND detail_url IS NOT NULL
         AND detail_url <> ''`,
      ids
    );
    return rows || [];
  }

  // Prefer junk candidates: agent headshots, theme map pins, chrome.
  const junkNeedle =
    dialect === "postgres"
      ? `(images::text ILIKE '%portfolio%'
         OR images::text ILIKE '%google-play%'
         OR images::text ILIKE '%dashboard%'
         OR images::text ILIKE '%avatar%'
         OR images::text ILIKE '%-150x150%'
         OR images::text ILIKE '%/themes/%'
         OR images::text ILIKE '%pin-single%'
         OR images::text ILIKE '%/img/map/%'
         OR images::text ILIKE '%IMG_20220825_184149_891%'
         OR images::text ILIKE '%/leul.jpg%'
         OR images::text ~* '/uploads/[0-9]{4}/[0-9]{2}/[a-z]{2,14}\\.(jpe?g|png)')`
      : `(images LIKE '%portfolio%'
         OR images LIKE '%google-play%'
         OR images LIKE '%dashboard%'
         OR images LIKE '%avatar%'
         OR images LIKE '%-150x150%'
         OR images LIKE '%/themes/%'
         OR images LIKE '%pin-single%'
         OR images LIKE '%/img/map/%'
         OR images LIKE '%IMG_20220825_184149_891%'
         OR images LIKE '%/leul.jpg%')`;

  const whereForce = force
    ? `AND source_website IN ('realethio.com', 'ethiopiarealty.com')`
    : `AND source_website IN ('realethio.com', 'ethiopiarealty.com') AND ${junkNeedle}`;

  const [rows] = await query(
    `SELECT property_id, detail_url, images
     FROM properties
     WHERE is_active = TRUE
       AND detail_url IS NOT NULL AND detail_url <> ''
       ${whereForce}
     ORDER BY last_seen DESC
     LIMIT ?`,
    [lim]
  );
  return rows || [];
}

/**
 * Re-fetch RealEthio/EthiopiaRealty galleries without agent headshots / site chrome.
 */
async function repairRealEthioImages({
  limit = 25,
  sleepMs = SLEEP_MS,
  force = false,
  propertyIds = [],
  imagesById = null,
  onProgress
} = {}) {
  const todo = await listRealEthioForRepair({ limit, force, propertyIds });
  const results = {
    total: todo.length,
    fixed: 0,
    cleaned: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  // Cheap pass: strip junk from any RealEthio gallery already in DB.
  const [allRe] = await query(
    `SELECT property_id, images
     FROM properties
     WHERE is_active = TRUE
       AND source_website IN ('realethio.com', 'ethiopiarealty.com')
     ORDER BY last_seen DESC
     LIMIT 800`
  );
  for (const row of allRe || []) {
    const rawList = parseImages(row.images);
    if (!rawList.length || !hasJunkGallery(rawList)) continue;
    const cleaned = sanitizeListingImages(rawList);
    if (cleaned.length && cleaned.length < rawList.length) {
      await updateImages(row.property_id, cleaned);
      results.cleaned += 1;
    } else if (!cleaned.length && rawList.length) {
      // All junk — leave for re-fetch below if selected.
    }
  }

  const overrides =
    imagesById && typeof imagesById === "object" && !Array.isArray(imagesById) ? imagesById : null;

  for (let i = 0; i < todo.length; i += 1) {
    const row = todo[i];
    const propertyId = row.property_id;
    try {
      let images = [];
      const override = overrides?.[propertyId];
      if (Array.isArray(override) && override.length) {
        images = sanitizeListingImages(override, { max: MAX_IMAGES });
      } else {
        const html = await fetchHtml(row.detail_url);
        images = extractRealEthioImagesFromHtml(html, row.detail_url);
      }
      if (!images.length) {
        results.failed += 1;
        results.details.push({ propertyId, ok: false, reason: "no gallery images found" });
      } else {
        await updateImages(propertyId, images);
        results.fixed += 1;
        results.details.push({ propertyId, ok: true, count: images.length, sample: images[0] });
      }
    } catch (err) {
      results.failed += 1;
      results.details.push({ propertyId, ok: false, reason: err.message || String(err) });
    }
    if (typeof onProgress === "function") onProgress(i + 1, todo.length, results);
    if (i < todo.length - 1 && sleepMs > 0) await sleep(sleepMs);
  }

  return results;
}

module.exports = {
  repairRealEthioImages,
  extractRealEthioImagesFromHtml,
  hasJunkGallery
};
