const { query, dialect } = require("../db/connection");
const { sanitizeListingImages, parseImages, isJunkImage } = require("./sanitizeListingImages");

const MAX_IMAGES = 6;
const FETCH_TIMEOUT_MS = 45000;
const SLEEP_MS = 800;
const BASE = "https://www.expat.com";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function listingNumericId(detailUrl, propertyId) {
  const fromUrl = String(detailUrl || "").match(/\/(\d+)-[^/]+\.html/i);
  if (fromUrl) return fromUrl[1];
  const fromPid = String(propertyId || "").match(/^EX(\d+)$/i);
  return fromPid ? fromPid[1] : null;
}

function absolutize(src) {
  let s = String(src || "")
    .trim()
    .replace(/\\\//g, "/")
    .replace(/\\u002F/gi, "/");
  if (!s) return null;
  if (s.startsWith("//")) s = `https:${s}`;
  else if (s.startsWith("/")) s = `${BASE}${s}`;
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

function isExpatListingPhoto(url, listingId) {
  const low = String(url || "").toLowerCase();
  if (!low || isJunkImage(low)) return false;
  if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test(low)) return false;
  if (listingId) return low.includes(`/upload/housing/${listingId}/`);
  return /\/upload\/housing\/\d+\//i.test(low);
}

/**
 * Prefer JSON-LD RealEstateListing.image, then og:image, then /upload/housing/{id}/.
 */
function extractExpatImagesFromHtml(html, detailUrl = "", propertyId = "") {
  const text = String(html || "");
  const listingId = listingNumericId(detailUrl, propertyId);
  const found = [];

  function add(raw) {
    const abs = absolutize(raw);
    if (!abs || !isExpatListingPhoto(abs, listingId)) return;
    if (!found.includes(abs)) found.push(abs);
  }

  const ldBlocks = text.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const block of ldBlocks) {
    const raw = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>\s*$/i, "");
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        let images = node.image || node.photo;
        if (typeof images === "string") images = [images];
        if (!Array.isArray(images)) continue;
        for (const img of images) {
          if (img && typeof img === "object") add(img.url || img.contentUrl || "");
          else add(String(img || ""));
        }
      }
    } catch {
      /* ignore broken JSON-LD */
    }
  }

  const og =
    text.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i) ||
    text.match(/content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i);
  if (og?.[1]) add(og[1]);

  if (listingId) {
    const reAbs = new RegExp(
      `https?:\\\\?/\\\\?/[^"'\\s<>]*?/upload/housing/${listingId}/[^"'\\s<>]+\\.(?:jpe?g|png|webp|gif)`,
      "gi"
    );
    let m;
    while ((m = reAbs.exec(text))) add(m[0]);
    const reRel = new RegExp(
      `/upload/housing/${listingId}/[^"'\\s<>]+\\.(?:jpe?g|png|webp|gif)`,
      "gi"
    );
    while ((m = reRel.exec(text))) add(m[0]);
  }

  return sanitizeListingImages(found, { max: MAX_IMAGES });
}

function hasJunkExpatGallery(raw) {
  const list = parseImages(raw);
  if (!list.length) return true;
  if (list.some((u) => isJunkImage(u))) return true;
  if (!list.some((u) => /\/upload\/housing\/\d+\//i.test(u))) return true;
  return false;
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.expat.com/en/housing/africa/ethiopia/"
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

async function listExpatForRepair({ limit = 40, force = false, propertyIds = [] } = {}) {
  const ids = (propertyIds || []).map((x) => String(x).trim()).filter(Boolean);
  const lim = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 120) : 40;

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

  const junkNeedle =
    dialect === "postgres"
      ? `(images IS NULL
         OR images::text IN ('[]', 'null', '')
         OR images::text ILIKE '%/images/guides/%'
         OR images::text ILIKE '%/images/marketplace/%'
         OR images::text ILIKE '%location-header%'
         OR images::text ILIKE '%business_directory%'
         OR images::text NOT ILIKE '%/upload/housing/%')`
      : `(images IS NULL
         OR images IN ('[]', 'null', '')
         OR images LIKE '%/images/guides/%'
         OR images LIKE '%/images/marketplace/%'
         OR images LIKE '%location-header%'
         OR images LIKE '%business_directory%'
         OR images NOT LIKE '%/upload/housing/%')`;

  const whereForce = force
    ? `AND source_website = 'expat.com'`
    : `AND source_website = 'expat.com' AND ${junkNeedle}`;

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

async function repairExpatImages({
  limit = 40,
  sleepMs = SLEEP_MS,
  force = false,
  propertyIds = [],
  onProgress
} = {}) {
  const todo = await listExpatForRepair({ limit, force, propertyIds });
  const results = {
    total: todo.length,
    fixed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  for (let i = 0; i < todo.length; i += 1) {
    const row = todo[i];
    const propertyId = row.property_id;
    try {
      if (!force && !hasJunkExpatGallery(row.images) && !(propertyIds || []).length) {
        results.skipped += 1;
        results.details.push({ propertyId, ok: true, skipped: true });
      } else {
        const html = await fetchHtml(row.detail_url);
        const images = extractExpatImagesFromHtml(html, row.detail_url, propertyId);
        if (!images.length) {
          results.failed += 1;
          results.details.push({ propertyId, ok: false, reason: "no listing gallery found" });
        } else {
          await updateImages(propertyId, images);
          results.fixed += 1;
          results.details.push({ propertyId, ok: true, count: images.length, sample: images[0] });
        }
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
  repairExpatImages,
  extractExpatImagesFromHtml,
  hasJunkExpatGallery,
  listingNumericId
};
