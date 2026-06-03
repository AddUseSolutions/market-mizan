#!/usr/bin/env node
/** Run listing maintenance (365-day rule). Usage: node scripts/run-maintenance.js */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { ensureFeedbackSchema } = require("../db/ensureSchema");
const { query, dialect } = require("../db/connection");

async function main() {
  await ensureFeedbackSchema();
  const maxDays = Number(process.env.CRAWLED_MAX_AGE_DAYS || 365);
  if (dialect === "postgres") {
    await query(
      `UPDATE properties SET is_active = FALSE
       WHERE is_active = TRUE AND listing_origin = 'crawled'
         AND first_seen < NOW() - ($1 || ' days')::interval`,
      [maxDays]
    );
  } else {
    await query(
      `UPDATE properties SET is_active = FALSE
       WHERE is_active = TRUE AND listing_origin = 'crawled'
         AND first_seen < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [maxDays]
    );
  }
  console.log(`OK: applied ${maxDays}-day crawled listing rule`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
