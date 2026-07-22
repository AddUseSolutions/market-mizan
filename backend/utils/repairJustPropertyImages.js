const { query, dialect } = require("../db/connection");
const { sanitizeListingImages, parseImages } = require("./sanitizeListingImages");

const ORIGIN = "https://www.just.property";
const MAX_IMAGES = 12;
const FETCH_TIMEOUT_MS = 45000;
const SLEEP_MS = 1200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isEmptyImages(raw) {
  const cleaned = sanitizeListingImages(raw);
  return cleaned.length === 0;
}

function absolutize(src) {
  const s = String(src || "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  try {
    return new URL(s, ORIGIN).href;
  } catch {
    return null;
  }
}

function isLikelyListingImage(url) {
  const low = String(url || "").toLowerCase();
  if (!low) return false;
  if (!/\.(jpe?g|png|webp|avif)(\?|$)/i.test(low)) return false;
  if (/logo|avatar|icon|favicon|placeholder|sprite|\/maps\//i.test(low)) return false;
  return (
    low.includes("cloudfront.net") ||
    low.includes("/media/uploads/") ||
    low.includes("just.property") ||
    low.includes("/wp-content/")
  );
}

/** Extract gallery URLs from raw HTML without a DOM parser. */
function extractImagesFromHtml(html) {
  const text = String(html || "");
  const found = [];
  const seen = new Set();

  const patterns = [
    /(?:src|data-src|data-lazy-src|data-original|data-large_image|content)=["']([^"']+)["']/gi,
    /href=["']([^"']+\.(?:jpe?g|png|webp|avif)(?:\?[^"']*)?)["']/gi,
    /https?:\/\/[^\s"'<>]+cloudfront\.net\/[^\s"'<>]+/gi,
    /https?:\/\/[^\s"'<>]+\/media\/uploads\/[^\s"'<>]+/gi
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(text))) {
      const raw = m[1] || m[0];
      const abs = absolutize(raw.replace(/&amp;/g, "&"));
      if (!abs || !isLikelyListingImage(abs) || seen.has(abs)) continue;
      seen.add(abs);
      found.push(abs);
      if (found.length >= 80) break;
    }
  }
  return sanitizeListingImages(found, { max: MAX_IMAGES });
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarketMizanImageRepair/1.0)",
        Accept: "text/html,application/xhtml+xml"
      },
      redirect: "follow"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function listJustPropertyNeedingImages(limit = 0) {
  const [rows] = await query(
    `SELECT id, property_id, detail_url, images
     FROM properties
     WHERE is_active = TRUE
       AND source_website = 'just.property'
       AND detail_url IS NOT NULL
     ORDER BY last_seen DESC`
  );
  const need = rows.filter((r) => isEmptyImages(r.images));
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
 * Repair empty/bad Just Property galleries AND clean stored map screenshots.
 */
async function repairJustPropertyImages({ limit = 0, sleepMs = SLEEP_MS, onProgress } = {}) {
  const todo = await listJustPropertyNeedingImages(limit);
  const results = { total: todo.length, fixed: 0, failed: 0, skipped: 0, cleaned: 0, details: [] };

  // Also clean listings that already have images but still include /maps/ screenshots.
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
  listJustPropertyNeedingImages
};
