/**
 * One-off repair: convert Just Property rows where price_etb is NULL (raw ZAR stored as USD).
 * Usage: node scripts/repair-justproperty-prices.js
 */
require("dotenv").config();
const { query } = require("../db/connection");
const { repairJustPropertyPricing } = require("../utils/fxRate");

async function main() {
  const [rows] = await query(
    `SELECT * FROM properties
     WHERE source_website = 'just.property'
       AND (price_etb IS NULL OR price_etb <= 0)
       AND COALESCE(price_usd, price) IS NOT NULL`
  );

  let updated = 0;
  for (const row of rows) {
    const fixed = repairJustPropertyPricing(row);
    if (!fixed.price_etb || !fixed.price_usd) continue;
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
