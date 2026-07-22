const { query, dialect } = require("../db/connection");
const { sanitizeListingImages, parseImages } = require("./sanitizeListingImages");

const ORIGIN = "https://www.just.property";
const MAX_IMAGES = 12;
const FETCH_TIMEOUT_MS = 45000;
const SLEEP_MS = 800;
const HASH_RE = /([a-f0-9]{32})/i;
const CDN_URL_RE =
  /https?:\/\/[a-z0-9.-]*cloudfront\.net\/media\/uploads\/[^"'\\\s<>]+?\.(?:jpe?g|png|webp|avif)(?:\?[^"'\\\s<>]*)?/gi;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isEmptyImages(raw) {
  return sanitizeListingImages(raw).length === 0;
}

function needsMoreImages(raw, minUnique = 3) {
  return sanitizeListingImages(raw).length < minUnique;
}

function absolutize(src) {
  const s = String(src || "").trim().replace(/\\u002F/g, "/").replace(/\\\//g, "/");
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  try {
    return new URL(s, ORIGIN).href;
  } catch {
    return null;
  }
}

function widthFromUrl(url) {
  const m = String(url).match(/_t_w_(\d+)/i);
  return m ? Number(m[1]) : 0;
}

function hashFromUrl(url) {
  const m = String(url).match(HASH_RE);
  return m ? m[1].toLowerCase() : null;
}

function isUsableGalleryUrl(url) {
  const low = String(url || "").toLowerCase();
  if (!low) return false;
  if (!/\.(jpe?g|png|webp|avif)(\?|$)/i.test(low)) return false;
  if (/\/maps\//i.test(low)) return false;
  if (/logo|avatar|icon|favicon|placeholder|sprite/i.test(low)) return false;
  if (!low.includes("cloudfront.net") && !low.includes("/media/uploads/")) return false;
  // Prefer residential / property media; skip agency logos etc.
  if (low.includes("/media/uploads/") && !/\/(residential|commercial|property|listings?)\//i.test(low)) {
    // still allow if hash present (some paths differ)
    if (!HASH_RE.test(low)) return false;
  }
  const w = widthFromUrl(low);
  if (w > 0 && w < 320) return false;
  return true;
}

/**
 * Collect unique gallery photos from Just Property HTML/JSON payloads.
 */
function extractImagesFromHtml(html) {
  const text = String(html || "");
  const bestByHash = new Map();

  function consider(raw) {
    const abs = absolutize(String(raw || "").replace(/&amp;/g, "&"));
    if (!abs || !isUsableGalleryUrl(abs)) return;
    const hash = hashFromUrl(abs) || abs.toLowerCase();
    const prev = bestByHash.get(hash);
    if (!prev || widthFromUrl(abs) > widthFromUrl(prev)) {
      bestByHash.set(hash, abs);
    }
  }

  // 1) Direct CDN URLs anywhere in HTML/JSON
  let m;
  CDN_URL_RE.lastIndex = 0;
  while ((m = CDN_URL_RE.exec(text))) {
    consider(m[0]);
  }

  // 2) Attribute values
  const attrRe =
    /(?:src|data-src|data-lazy-src|data-original|data-large_image|href|content)=["']([^"']+)["']/gi;
  while ((m = attrRe.exec(text))) {
    consider(m[1]);
  }

  // 3) Escaped JSON URLs inside React payloads
  const escapedRe =
    /https?:\\\/\\\/[a-z0-9.-]*cloudfront\.net\\\/media\\\/uploads\\\/[^"'\\\s]+?\.(?:jpe?g|png|webp|avif)/gi;
  while ((m = escapedRe.exec(text))) {
    consider(m[0]);
  }

  const unique = [...bestByHash.values()].sort((a, b) => widthFromUrl(b) - widthFromUrl(a));
  return sanitizeListingImages(unique, { max: MAX_IMAGES });
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/json",
        "Accept-Language": "en-US,en;q=0.9"
      },
      redirect: "follow"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function listJustPropertyForRepair({ limit = 0, force = false, minUnique = 3 } = {}) {
  const [rows] = await query(
    `SELECT id, property_id, detail_url, images
     FROM properties
     WHERE is_active = TRUE
       AND source_website = 'just.property'
       AND detail_url IS NOT NULL
     ORDER BY last_seen DESC`
  );
  const need = force
    ? rows.filter((r) => needsMoreImages(r.images, minUnique) || isEmptyImages(r.images))
    : rows.filter((r) => isEmptyImages(r.images));
  if (limit > 0) return need.slice(0, limit);
  return need;
}

async function updateImages(propertyId, images) {
  const payload = JSON.stringify(images);
  if (dialect === "postgres") {
    await query(`UPDATE properties SET images = CAST(? AS jsonb), last_seen = NOW() WHERE property_id = ?`, [
      payload,
      propertyId
    ]);
  } else {
    await query(`UPDATE properties SET images = ?, last_seen = NOW() WHERE property_id = ?`, [payload, propertyId]);
  }
}

/**
 * Repair Just Property galleries by re-fetching detail pages.
 * force=true refreshes listings that still have fewer than minUnique photos.
 */
async function repairJustPropertyImages({
  limit = 0,
  sleepMs = SLEEP_MS,
  force = false,
  minUnique = 3,
  onProgress
} = {}) {
  const todo = await listJustPropertyForRepair({ limit, force, minUnique });
  const results = { total: todo.length, fixed: 0, failed: 0, skipped: 0, cleaned: 0, details: [] };

  // Quick clean of map screenshots already stored
  const [allJp] = await query(
    `SELECT property_id, images
     FROM properties
     WHERE is_active = TRUE AND source_website = 'just.property'
     ORDER BY last_seen DESC
     LIMIT 500`
  );
  for (const row of allJp) {
    const cleaned = sanitizeListingImages(row.images);
    const rawList = parseImages(row.images);
    if (cleaned.length && cleaned.length < rawList.length) {
      await updateImages(row.property_id, cleaned);
      results.cleaned += 1;
    }
  }

  for (let i = 0; i < todo.length; i += 1) {
    const row = todo[i];
    const propertyId = row.property_id;
    const detailUrl = row.detail_url;
    try {
      const html = await fetchHtml(detailUrl);
      const images = extractImagesFromHtml(html);
      if (!images.length) {
        results.failed += 1;
        results.details.push({ propertyId, ok: false, reason: "no images found" });
      } else {
        await updateImages(propertyId, images);
        results.fixed += 1;
        results.details.push({ propertyId, ok: true, count: images.length });
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
  repairJustPropertyImages,
  extractImagesFromHtml,
  isEmptyImages,
  listJustPropertyNeedingImages: (limit) => listJustPropertyForRepair({ limit, force: false })
};
