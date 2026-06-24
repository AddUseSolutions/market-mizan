/**
 * Repair Just Property rows: ZAR→USD→ETB (fixes NULL price_etb and ZAR-stored-as-ETB).
 * Usage: node scripts/repair-justproperty-prices.js
 */
require("dotenv").config();
const { query } = require("../db/connection");
const { repairJustPropertyPricing, isCorruptJustPropertyPricing } = require("../utils/fxRate");

async function main() {
  const [rows] = await query(`SELECT * FROM properties WHERE source_website = 'just.property'`);

  let updated = 0;
  for (const row of rows) {
    const corrupt = isCorruptJustPropertyPricing(row);
    const missing = !row.price_etb || Number(row.price_etb) <= 0;
    if (!corrupt && !missing) continue;

    const fixed = repairJustPropertyPricing(row);
    if (!fixed.price_etb || !fixed.price_usd) continue;
    if (
      !corrupt &&
      !missing &&
      Number(fixed.price_etb) === Number(row.price_etb) &&
      Number(fixed.price_usd) === Number(row.price_usd)
    ) {
      continue;
    }

    await query(
      `UPDATE properties
       SET price = ?, price_etb = ?, price_usd = ?,
           fx_rate_zar_usd = COALESCE(?, fx_rate_zar_usd),
           fx_rate_etb_usd = COALESCE(?, fx_rate_etb_usd),
           fx_rate_date = COALESCE(?, fx_rate_date),
           currency = 'ETB'
       WHERE id = ?`,
      [
        fixed.price_etb,
        fixed.price_etb,
        fixed.price_usd,
        fixed.fx_rate_zar_usd,
        fixed.fx_rate_etb_usd,
        fixed.fx_rate_date,
        row.id
      ]
    );
    updated += 1;
  }

  console.log(`Repaired ${updated} of ${rows.length} Just Property rows.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
