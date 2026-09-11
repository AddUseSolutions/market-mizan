const { query } = require("../db/connection");
const { inferListingStatusFromText } = require("./listingFilters");

/**
 * Backfill missing property_status from title / detail_url for active listings.
 * Fixes Rent/Buy filters when scrapes left status NULL but titles say "For Sale/Rent".
 */
async function repairListingStatuses({ dryRun = false, limit = 5000 } = {}) {
  const lim = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 20000) : 5000;
  const [rows] = await query(
    `SELECT property_id, title, detail_url, property_status, source_website
     FROM properties
     WHERE is_active = TRUE
       AND (property_status IS NULL OR TRIM(property_status) = '')
     ORDER BY last_seen DESC
     LIMIT ?`,
    [lim]
  );

  const results = {
    scanned: (rows || []).length,
    forRent: 0,
    forSale: 0,
    skipped: 0,
    updated: 0,
    dryRun: Boolean(dryRun),
    samples: []
  };

  for (const row of rows || []) {
    const inferred = inferListingStatusFromText(`${row.title || ""} ${row.detail_url || ""}`, {
      sourceWebsite: row.source_website
    });
    if (!inferred) {
      results.skipped += 1;
      continue;
    }
    if (inferred === "For Rent") results.forRent += 1;
    else results.forSale += 1;

    if (results.samples.length < 12) {
      results.samples.push({
        propertyId: row.property_id,
        status: inferred,
        title: String(row.title || "").slice(0, 80)
      });
    }

    if (!dryRun) {
      await query(`UPDATE properties SET property_status = ? WHERE property_id = ?`, [
        inferred,
        row.property_id
      ]);
      results.updated += 1;
    }
  }

  return results;
}

module.exports = { repairListingStatuses, inferListingStatusFromText };
