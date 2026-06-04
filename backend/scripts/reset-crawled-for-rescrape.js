#!/usr/bin/env node
/**
 * Mark all crawled listings for a full re-scrape (soft reset).
 * Usage: node scripts/reset-crawled-for-rescrape.js [--hard]
 *
 * Soft (default): scraped_at = NULL — upsert updates existing rows.
 * Hard: deletes crawled properties and related community data (keeps verified + submissions).
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { query, dialect } = require("../db/connection");

async function countCrawled() {
  const [rows] = await query(
    `SELECT COUNT(*) AS n FROM properties WHERE listing_origin = 'crawled'`
  );
  return Number(rows[0]?.n ?? rows[0]?.N ?? 0);
}

async function softReset() {
  const before = await countCrawled();
  if (dialect === "postgres") {
    const [result] = await query(
      `UPDATE properties
       SET scraped_at = NULL,
           last_scrape_error_at = NULL,
           last_scrape_error_type = NULL
       WHERE listing_origin = 'crawled'`
    );
    return { mode: "soft", crawledTotal: before, updated: result?.rowCount ?? before };
  }
  const [result] = await query(
    `UPDATE properties
     SET scraped_at = NULL,
         last_scrape_error_at = NULL,
         last_scrape_error_type = NULL
     WHERE listing_origin = 'crawled'`
  );
  return { mode: "soft", crawledTotal: before, updated: result?.affectedRows ?? before };
}

async function hardReset() {
  const crawled = await countCrawled();
  const idsSubquery = `SELECT property_id FROM properties WHERE listing_origin = 'crawled'`;

  await query(`DELETE FROM price_history WHERE property_id IN (${idsSubquery})`);
  await query(`DELETE FROM property_reviews WHERE property_id IN (${idsSubquery})`);
  await query(`DELETE FROM listing_confirmations WHERE property_id IN (${idsSubquery})`);
  await query(`DELETE FROM user_favorites WHERE property_id IN (${idsSubquery})`);
  await query(`DELETE FROM listing_crowd_flags WHERE property_id IN (${idsSubquery})`);

  const [result] = await query(`DELETE FROM properties WHERE listing_origin = 'crawled'`);
  const deleted = result?.rowCount ?? result?.affectedRows ?? crawled;
  return { mode: "hard", crawledTotal: crawled, deleted };
}

async function main() {
  const hard = process.argv.includes("--hard");
  const out = hard ? await hardReset() : await softReset();
  console.log(JSON.stringify({ ok: true, ...out }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
