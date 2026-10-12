/**
 * Background check that scraped Houzez galleries (RealEthio / EthiopiaRealty) still
 * show the photos of the source listing. Agents reuse listing pages for other
 * properties, and older scrapes could keep photos from related-listing rails;
 * any stored photo that no longer appears on the source page is replaced by the
 * page's current gallery.
 */
const { query, dialect } = require("../db/connection");
const { parseImages } = require("./sanitizeListingImages");
const { extractRealEthioImagesFromHtml, fetchHtml, updateImages, imageKey } = require("./repairRealEthioImages");

const SOURCES = ["realethio.com", "ethiopiarealty.com"];
const RECHECK_DAYS = 7;
const BATCH_SIZE = 120;
const SLEEP_MS = 1500;
const INTERVAL_MS = 30 * 60 * 1000;
const BACKLOG_PAUSE_MS = 60 * 1000;

let running = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureCheckColumn() {
  if (dialect === "postgres") {
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS images_checked_at TIMESTAMPTZ");
    return;
  }
  const [cols] = await query("SHOW COLUMNS FROM properties LIKE 'images_checked_at'");
  if (!cols.length) await query("ALTER TABLE properties ADD COLUMN images_checked_at DATETIME NULL");
}

function uploadKey(url) {
  return imageKey(url).replace(/^.*\/wp-content\//, "/wp-content/");
}

/**
 * Decide the gallery to store for one listing: the page's own gallery when any stored
 * photo is not part of it (related-listing rails on the same page do not count).
 * Returns null when the stored gallery is fine or the page has no recognisable gallery.
 */
function reconcileGallery(storedImages, html, detailUrl) {
  const gallery = extractRealEthioImagesFromHtml(html, detailUrl);
  if (!gallery.length) return null;
  const galleryKeys = new Set(gallery.map(uploadKey));
  const stored = parseImages(storedImages);
  const foreign = stored.filter((u) => !galleryKeys.has(uploadKey(u)));
  return stored.length && !foreign.length ? null : gallery;
}

async function verifyScrapedGalleries({ limit = BATCH_SIZE, sleepMs = SLEEP_MS } = {}) {
  if (running) return { skipped: true };
  running = true;
  const result = { checked: 0, replaced: 0, failed: 0 };
  try {
    await ensureCheckColumn();
    const staleSql =
      dialect === "postgres"
        ? `images_checked_at < NOW() - INTERVAL '${RECHECK_DAYS} days'`
        : `images_checked_at < NOW() - INTERVAL ${RECHECK_DAYS} DAY`;
    const [rows] = await query(
      `SELECT property_id, detail_url, images FROM properties
       WHERE is_active = TRUE AND detail_url IS NOT NULL AND detail_url <> ''
         AND source_website IN (${SOURCES.map(() => "?").join(", ")})
         AND (images_checked_at IS NULL OR ${staleSql})
       ORDER BY images_checked_at IS NOT NULL, images_checked_at, last_seen DESC
       LIMIT ?`,
      [...SOURCES, limit]
    );

    for (const row of rows) {
      result.checked += 1;
      try {
        const html = await fetchHtml(row.detail_url);
        const next = reconcileGallery(row.images, html, row.detail_url);
        if (next) {
          await updateImages(row.property_id, next);
          result.replaced += 1;
        }
      } catch {
        result.failed += 1;
      }
      await query("UPDATE properties SET images_checked_at = NOW() WHERE property_id = ?", [row.property_id]);
      if (sleepMs > 0) await sleep(sleepMs);
    }
    if (result.checked) {
      console.log(`Gallery check: ${result.checked} checked, ${result.replaced} replaced, ${result.failed} failed.`);
    }
    return result;
  } finally {
    running = false;
  }
}

/** Works through a backlog in back-to-back batches, then settles to one batch per INTERVAL_MS. */
function startGalleryVerification() {
  const schedule = (ms) => setTimeout(run, ms).unref();
  const run = async () => {
    let backlog = false;
    try {
      const result = await verifyScrapedGalleries();
      backlog = !result.skipped && result.checked >= BATCH_SIZE;
    } catch (e) {
      console.error("Gallery check failed:", e.message);
    }
    schedule(backlog ? BACKLOG_PAUSE_MS : INTERVAL_MS);
  };
  schedule(2 * 60 * 1000);
}

module.exports = { verifyScrapedGalleries, startGalleryVerification, reconcileGallery };
