#!/usr/bin/env node
/**
 * Assign all Just Property listings to property@epmglobal.com (EPM),
 * mark them verified, set source_name to broker short name.
 *
 * Usage (with DATABASE_URL set, e.g. Render shell or local .env):
 *   node backend/scripts/assign-just-property-to-epm.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const { assignJustPropertyListingsToEpm } = require("../utils/assignJustPropertyToEpm");
const { ensureRbacSchema } = require("../db/ensureRbacSchema");

async function main() {
  await ensureRbacSchema();
  const result = await assignJustPropertyListingsToEpm();
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
