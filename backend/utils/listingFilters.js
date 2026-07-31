/** Patterns for grouped property type filter (property_type_group query param). */
const TYPE_GROUP_PATTERNS = {
  residential_apartment: ["%apartment%", "%condo%", "%flat%"],
  residential_villa: ["%villa%", "%house%", "%townhouse%", "%duplex%"],
  residential_studio: ["%studio%"],
  residential_room: ["%room%"],
  commercial_office: ["%office%"],
  commercial_shop: ["%shop%", "%retail%", "%store%"],
  commercial_building: ["%commercial%building%", "%building%commercial%", "%building for sale%", "%building for rent%"],
  commercial_hotel: ["%hotel%"],
  commercial_warehouse: ["%warehouse%", "%industrial%"],
  land_residential: ["%residential%land%", "%land%residential%", "%plot%"],
  land_commercial: ["%commercial%land%", "%land%commercial%"],
  land_agricultural: ["%agricultural%", "%farm%"],
};

/** Prefer real USD; never treat raw `price` (often ETB) as USD for rental caps. */
function usdEstimateSql(etbPerUsd = 130) {
  const rate = Number(etbPerUsd);
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 130;
  return `COALESCE(
    NULLIF(price_usd, 0),
    CASE WHEN price_etb IS NOT NULL AND price_etb > 0 THEN price_etb / ${safeRate} ELSE NULL END
  )`;
}

function rentalStatusSql() {
  return `(
    LOWER(COALESCE(property_status, '')) LIKE '%rent%'
    OR LOWER(COALESCE(property_status, '')) LIKE '%to let%'
    OR LOWER(COALESCE(property_status, '')) LIKE '%to-let%'
  )`;
}

/**
 * Hide absurd prices from public search.
 * - Rent: hide below ~ETB 8k/mo (typos like 2,500) and above ~USD 50k/mo
 * - Sale: hide below ETB 500k and above ETB 30M
 */
function priceCapClause(etbPerUsd = Number(process.env.FX_ETB_USD || 130)) {
  const usd = usdEstimateSql(etbPerUsd);
  const etb = `COALESCE(price_etb, price)`;
  return `NOT (
    (${rentalStatusSql()} AND (
      (${usd} IS NOT NULL AND ${usd} > 50000)
      OR (${etb} IS NOT NULL AND ${etb} > 0 AND ${etb} < 8000)
      OR (${usd} IS NOT NULL AND ${usd} > 0 AND ${usd} < 80)
    ))
    OR
    (NOT ${rentalStatusSql()} AND (
      ${etb} > 30000000
      OR (${etb} IS NOT NULL AND ${etb} > 0 AND ${etb} < 500000)
    ))
  )`;
}

/** SQL fragment: active rows with implausible prices (for maintenance deactivate). */
function implausiblePriceWhereSql(etbPerUsd = Number(process.env.FX_ETB_USD || 130)) {
  const usd = usdEstimateSql(etbPerUsd);
  const etb = `COALESCE(price_etb, price)`;
  return `(
    (${rentalStatusSql()} AND (
      (${etb} IS NOT NULL AND ${etb} > 0 AND ${etb} < 8000)
      OR (${usd} IS NOT NULL AND ${usd} > 0 AND ${usd} < 80)
    ))
    OR
    (NOT ${rentalStatusSql()} AND ${etb} IS NOT NULL AND ${etb} > 0 AND ${etb} < 500000)
  )`;
}

module.exports = {
  TYPE_GROUP_PATTERNS,
  priceCapClause,
  usdEstimateSql,
  implausiblePriceWhereSql,
  rentalStatusSql
};
