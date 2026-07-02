const { query } = require("./connection");
const { resolveCanonicalAreaOrDefault } = require("../utils/canonicalAreas");

async function backfillCanonicalAreas({ batchSize = 500, log = true } = {}) {
  let offset = 0;
  let updated = 0;
  let scanned = 0;

  for (;;) {
    const [rows] = await query(
      `SELECT property_id, location_area, location_district, title, description, description_original, canonical_area
       FROM properties
       ORDER BY property_id
       LIMIT ? OFFSET ?`,
      [batchSize, offset]
    );
    if (!rows.length) break;

    for (const row of rows) {
      scanned += 1;
      const next = resolveCanonicalAreaOrDefault(row);
      if (row.canonical_area === next) continue;
      await query(`UPDATE properties SET canonical_area = ? WHERE property_id = ?`, [next, row.property_id]);
      updated += 1;
    }

    offset += rows.length;
    if (rows.length < batchSize) break;
  }

  if (log) {
    console.log(`Canonical area backfill: ${updated} updated of ${scanned} properties.`);
  }
  return { updated, scanned };
}

module.exports = { backfillCanonicalAreas };
