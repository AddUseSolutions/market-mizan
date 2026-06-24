/**
 * Repair Just Property rows via site currency API (same as USD dropdown on just.property).
 * Usage: node scripts/repair-justproperty-prices.js
 */
require("dotenv").config();
const { query } = require("../db/connection");
const {
  repairJustPropertyPricingAsync,
  isCorruptJustPropertyPricing,
  needsJustPropertyApiRepair
} = require("../utils/fxRate");

async function main() {
  const [rows] = await query(`SELECT * FROM properties WHERE source_website = 'just.property'`);

  let updated = 0;
  for (const row of rows) {
    const corrupt = isCorruptJustPropertyPricing(row);
    const missing = !row.price_etb || Number(row.price_etb) <= 0;
    const needsApi = needsJustPropertyApiRepair(row);
    if (!corrupt && !missing && !needsApi) continue;

    const fixed = await repairJustPropertyPricingAsync(row);
    if (!fixed.price_etb || !fixed.price_usd) continue;
    if (
      !corrupt &&
      !missing &&
      !needsApi &&
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
    console.log(
      `  ${row.property_id}: ZAR ${fixed.source_price_zar ?? "?"} → USD ${fixed.price_usd} | ETB ${fixed.price_etb}`
    );
  }

  console.log(`Repaired ${updated} of ${rows.length} Just Property rows.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
