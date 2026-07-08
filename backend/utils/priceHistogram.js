const { query } = require("../db/connection");
const { buildWhere, resolvePriceColumn } = require("../controllers/propertyController");

const BUCKET_COUNT = 24;

function buildHistogram(rows, minPrice, maxPrice) {
  const range = maxPrice - minPrice || 1;
  const step = range / BUCKET_COUNT;
  const buckets = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
    start: minPrice + i * step,
    end: minPrice + (i + 1) * step,
    count: 0
  }));

  for (const row of rows) {
    const price = Number(row.price_value);
    if (!Number.isFinite(price)) continue;
    let idx = Math.floor((price - minPrice) / step);
    if (idx >= BUCKET_COUNT) idx = BUCKET_COUNT - 1;
    if (idx < 0) idx = 0;
    buckets[idx].count += 1;
  }

  return {
    buckets: buckets.map((b) => ({
      start: Math.round(b.start),
      end: Math.round(b.end),
      count: b.count
    })),
    min_price: Math.round(minPrice),
    max_price: Math.round(maxPrice),
    total: rows.length
  };
}

async function getPriceHistogram(queryParams) {
  const priceCol = resolvePriceColumn(queryParams);
  const { whereSql, params } = buildWhere(queryParams, { skipPriceFilter: true });

  const [[bounds]] = await query(
    `SELECT MIN(${priceCol}) AS min_price, MAX(${priceCol}) AS max_price
     FROM properties ${whereSql} AND ${priceCol} IS NOT NULL AND ${priceCol} > 0`,
    params
  );

  const minPrice = Number(bounds?.min_price) || 0;
  const maxPrice = Number(bounds?.max_price) || minPrice || 1;
  if (minPrice >= maxPrice) {
    return {
      currency: String(queryParams.price_currency || "usd").toLowerCase(),
      buckets: [{ start: minPrice, end: maxPrice, count: 0 }],
      min_price: Math.round(minPrice),
      max_price: Math.round(maxPrice),
      total: 0
    };
  }

  const [rows] = await query(
    `SELECT ${priceCol} AS price_value FROM properties ${whereSql} AND ${priceCol} IS NOT NULL AND ${priceCol} > 0`,
    params
  );

  return {
    currency: String(queryParams.price_currency || "usd").toLowerCase(),
    ...buildHistogram(rows, minPrice, maxPrice)
  };
}

module.exports = { getPriceHistogram, BUCKET_COUNT };
