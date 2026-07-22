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

function needsFacts(row) {
  // Size/description are nice-to-have; bedrooms/type are what cards show.
  return row.bedrooms == null || !row.property_type;
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
  if (low.includes("/media/uploads/") && !/\/(residential|commercial|property|listings?)\//i.test(low)) {
    if (!HASH_RE.test(low)) return false;
  }
  const w = widthFromUrl(low);
  if (w > 0 && w < 320) return false;
  return true;
}

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

  let m;
  CDN_URL_RE.lastIndex = 0;
  while ((m = CDN_URL_RE.exec(text))) consider(m[0]);

  const attrRe =
    /(?:src|data-src|data-lazy-src|data-original|data-large_image|href|content)=["']([^"']+)["']/gi;
  while ((m = attrRe.exec(text))) consider(m[1]);

  const escapedRe =
    /https?:\\\/\\\/[a-z0-9.-]*cloudfront\.net\\\/media\\\/uploads\\\/[^"'\\\s]+?\.(?:jpe?g|png|webp|avif)/gi;
  while ((m = escapedRe.exec(text))) consider(m[0]);

  const unique = [...bestByHash.values()].sort((a, b) => widthFromUrl(b) - widthFromUrl(a));
  return sanitizeListingImages(unique, { max: MAX_IMAGES });
}

function firstInt(text, patterns) {
  for (const re of patterns) {
    const m = String(text || "").match(re);
    if (!m) continue;
    const n = Number(String(m[1]).replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0 && n < 50) return n;
  }
  return null;
}

function firstSize(text) {
  const patterns = [
    /(\d{2,5}(?:[.,]\d+)?)\s*(?:m²|m2|sqm|sq\.?\s*m|square\s*metres?)/i,
    /(?:floor\s*area|living\s*area|size|erf)\s*[:\-]?\s*(\d{2,5}(?:[.,]\d+)?)/i
  ];
  for (const re of patterns) {
    const m = String(text || "").match(re);
    if (!m) continue;
    const n = Number(String(m[1]).replace(/,/g, "").replace(",", "."));
    if (Number.isFinite(n) && n >= 15 && n < 20000) return Math.round(n * 100) / 100;
  }
  return null;
}

function typeFromUrl(detailUrl) {
  try {
    const parts = new URL(detailUrl).pathname.split("/").filter(Boolean);
    // .../to-let/{district}/{area}/{type}/{id}
    const idx = parts.findIndex((p) => p === "to-let" || p === "for-sale");
    if (idx >= 0 && parts[idx + 3]) {
      const raw = parts[idx + 3].replace(/-/g, " ");
      return raw.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  } catch {
    /* ignore */
  }
  return null;
}

function extractTitle(html) {
  const og = String(html || "").match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || String(html || "").match(/content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (og?.[1]) return og[1].replace(/\s+/g, " ").trim();
  const h1 = String(html || "").match(/<h1[^>]*>([^<]{5,180})<\/h1>/i);
  if (h1?.[1]) return h1[1].replace(/\s+/g, " ").trim();
  return null;
}

function extractDescription(html) {
  const og = String(html || "").match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    || String(html || "").match(/content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
  if (og?.[1]) return og[1].replace(/\s+/g, " ").trim().slice(0, 4000);
  return null;
}

/** Pull bedrooms / bathrooms / size / type / description from JP HTML. */
function extractFactsFromHtml(html, detailUrl = "") {
  const text = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

  const bedrooms =
    firstInt(text, [
      /(?:bedrooms?|beds?)\s*[:\-]?\s*(\d+)/i,
      /(\d+)\s*(?:bedrooms?|beds?)\b/i,
      /(\d+)\s*bed\b/i
    ]) ||
    firstInt(extractTitle(html) || "", [
      /(\d+)\s*(?:bedrooms?|beds?)\b/i,
      /(?:bedrooms?|beds?)\s*[:\-]?\s*(\d+)/i
    ]);

  const bathrooms =
    firstInt(text, [
      /(?:bathrooms?|baths?)\s*[:\-]?\s*(\d+)/i,
      /(\d+)\s*(?:bathrooms?|baths?)\b/i
    ]) || null;

  const property_size_m2 = firstSize(text);
  const property_type = typeFromUrl(detailUrl);
  const title = extractTitle(html);
  const description = extractDescription(html) || null;

  // Title like "4 Bedroom House To Let in Aware" → bedrooms
  let beds = bedrooms;
  if (beds == null && title) {
    beds = firstInt(title, [/(\d+)\s*(?:bedrooms?|beds?)\b/i]);
  }

  return {
    bedrooms: beds,
    bathrooms,
    property_size_m2,
    property_type,
    title,
    description
  };
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

async function listJustPropertyForRepair({ limit = 0, force = false, minUnique = 3, facts = true } = {}) {
  const [rows] = await query(
    `SELECT id, property_id, detail_url, images, bedrooms, bathrooms, property_size_m2,
            property_type, description, description_original, title
     FROM properties
     WHERE is_active = TRUE
       AND source_website = 'just.property'
       AND detail_url IS NOT NULL
     ORDER BY
       CASE WHEN bedrooms IS NULL THEN 0 ELSE 1 END,
       property_id ASC`
  );
  const need = rows.filter((r) => {
    const imagesNeed = force
      ? needsMoreImages(r.images, minUnique) || isEmptyImages(r.images)
      : isEmptyImages(r.images);
    const factsNeed = facts && needsFacts(r);
    return force ? imagesNeed || factsNeed : imagesNeed || factsNeed;
  });
  if (limit > 0) return need.slice(0, limit);
  return need;
}

async function updateImages(propertyId, images) {
  const payload = JSON.stringify(images);
  if (dialect === "postgres") {
    await query(`UPDATE properties SET images = CAST(? AS jsonb) WHERE property_id = ?`, [payload, propertyId]);
  } else {
    await query(`UPDATE properties SET images = ? WHERE property_id = ?`, [payload, propertyId]);
  }
}

async function updateFacts(propertyId, facts, existing = {}) {
  const bedrooms = existing.bedrooms != null ? existing.bedrooms : facts.bedrooms;
  const bathrooms = existing.bathrooms != null ? existing.bathrooms : facts.bathrooms;
  const size = existing.property_size_m2 != null ? existing.property_size_m2 : facts.property_size_m2;
  const type = existing.property_type || facts.property_type || null;
  const description =
    String(existing.description_original || existing.description || "").trim() ||
    facts.description ||
    null;
  // Prefer richer titles that include bedroom counts when current title is generic.
  let title = existing.title || null;
  if (facts.title) {
    const currentGeneric = !/\d+\s*bed/i.test(String(existing.title || ""));
    const incomingHasBeds = /\d+\s*bed/i.test(facts.title);
    if (!title || (currentGeneric && incomingHasBeds) || facts.title.length > String(title).length + 5) {
      title = facts.title;
    }
  }

  await query(
    `UPDATE properties
     SET bedrooms = COALESCE(?, bedrooms),
         bathrooms = COALESCE(?, bathrooms),
         property_size_m2 = COALESCE(?, property_size_m2),
         property_type = COALESCE(?, property_type),
         title = COALESCE(?, title),
         description = COALESCE(?, description),
         description_original = COALESCE(?, description_original)
     WHERE property_id = ?`,
    [bedrooms, bathrooms, size, type, title, description, description, propertyId]
  );

  return { bedrooms, bathrooms, property_size_m2: size, property_type: type, title };
}

/**
 * Repair Just Property galleries + missing bedrooms/size/type from detail pages.
 */
async function repairJustPropertyImages({
  limit = 0,
  sleepMs = SLEEP_MS,
  force = false,
  minUnique = 3,
  onProgress
} = {}) {
  const todo = await listJustPropertyForRepair({ limit, force, minUnique, facts: true });
  const results = {
    total: todo.length,
    fixed: 0,
    failed: 0,
    skipped: 0,
    cleaned: 0,
    factsFixed: 0,
    details: []
  };

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
      const facts = extractFactsFromHtml(html, detailUrl);
      let imageCount = sanitizeListingImages(row.images).length;
      if (images.length) {
        await updateImages(propertyId, images);
        imageCount = images.length;
        results.fixed += 1;
      }
      const updatedFacts = await updateFacts(propertyId, facts, row);
      if (updatedFacts.bedrooms != null || updatedFacts.bathrooms != null || updatedFacts.property_size_m2 != null) {
        results.factsFixed += 1;
      }
      results.details.push({
        propertyId,
        ok: true,
        count: imageCount,
        bedrooms: updatedFacts.bedrooms,
        bathrooms: updatedFacts.bathrooms,
        size: updatedFacts.property_size_m2,
        type: updatedFacts.property_type
      });
      if (!images.length && updatedFacts.bedrooms == null) {
        results.failed += 1;
        results.details[results.details.length - 1].ok = false;
        results.details[results.details.length - 1].reason = "no images or bedrooms found";
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
  extractFactsFromHtml,
  isEmptyImages,
  listJustPropertyNeedingImages: (limit) => listJustPropertyForRepair({ limit, force: false })
};
