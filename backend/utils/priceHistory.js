const { query, dialect } = require("../db/connection");

function toNum(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pricesDiffer(a, b) {
  const left = toNum(a);
  const right = toNum(b);
  if (left == null && right == null) return false;
  if (left == null || right == null) return true;
  return Math.abs(left - right) > 0.01;
}

async function insertPriceHistory(propertyId, priceEtb, priceUsd) {
  if (!propertyId) return false;
  const etb = toNum(priceEtb);
  const usd = toNum(priceUsd);
  if (etb == null && usd == null) return false;
  await query(`INSERT INTO price_history (property_id, price_etb, price_usd) VALUES (?, ?, ?)`, [
    propertyId,
    etb,
    usd
  ]);
  return true;
}

/**
 * Compare current DB row vs incoming prices; seed baseline if history is empty,
 * then append a row when ETB (or USD-only) changed.
 */
async function recordPriceChange(propertyId, nextEtb, nextUsd) {
  if (!propertyId) return { seeded: false, recorded: false };

  const [[row]] = await query(
    `SELECT price, price_etb, price_usd FROM properties WHERE property_id = ? LIMIT 1`,
    [propertyId]
  );
  if (!row) return { seeded: false, recorded: false };

  const [[hist]] = await query(
    `SELECT COUNT(*) AS c FROM price_history WHERE property_id = ?`,
    [propertyId]
  );
  const historyCount = Number(hist?.c || 0);

  const oldEtb = toNum(row.price_etb ?? row.price);
  const oldUsd = toNum(row.price_usd);
  const newEtb = toNum(nextEtb);
  const newUsd = toNum(nextUsd);

  let seeded = false;
  let recorded = false;

  if (historyCount === 0 && (oldEtb != null || oldUsd != null)) {
    seeded = await insertPriceHistory(propertyId, oldEtb, oldUsd);
  }

  const etbChanged = pricesDiffer(oldEtb, newEtb);
  const usdOnlyChange = newEtb == null && pricesDiffer(oldUsd, newUsd);
  if ((etbChanged || usdOnlyChange) && (newEtb != null || newUsd != null)) {
    recorded = await insertPriceHistory(propertyId, newEtb ?? oldEtb, newUsd ?? oldUsd);
  } else if (historyCount === 0 && !seeded && (newEtb != null || newUsd != null)) {
    recorded = await insertPriceHistory(propertyId, newEtb, newUsd);
  }

  return { seeded, recorded };
}

/** One-shot seed: active priced listings with no history get a baseline row. */
async function backfillMissingPriceHistory() {
  const sql =
    dialect === "postgres"
      ? `
    INSERT INTO price_history (property_id, price_etb, price_usd)
    SELECT p.property_id, COALESCE(p.price_etb, p.price), p.price_usd
    FROM properties p
    WHERE p.is_active = TRUE
      AND COALESCE(p.price_etb, p.price, p.price_usd) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM price_history ph WHERE ph.property_id = p.property_id
      )
    `
      : `
    INSERT INTO price_history (property_id, price_etb, price_usd)
    SELECT p.property_id, COALESCE(p.price_etb, p.price), p.price_usd
    FROM properties p
    WHERE p.is_active = TRUE
      AND COALESCE(p.price_etb, p.price, p.price_usd) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM price_history ph WHERE ph.property_id = p.property_id
      )
    `;
  const result = await query(sql);
  // mysql2: [ResultSetHeader, fields]; pg wrapper may differ — treat leniently
  const header = Array.isArray(result) ? result[0] : result;
  return Number(header?.rowCount ?? header?.affectedRows ?? 0) || 0;
}

module.exports = {
  toNum,
  pricesDiffer,
  insertPriceHistory,
  recordPriceChange,
  backfillMissingPriceHistory
};
