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
  land_agricultural: ["%agricultural%", "%farm%"]
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

/** True when status column clearly says rent / to-let. */
function rentalStatusColumnSql() {
  return `(
    LOWER(COALESCE(property_status, '')) LIKE '%rent%'
    OR LOWER(COALESCE(property_status, '')) LIKE '%to let%'
    OR LOWER(COALESCE(property_status, '')) LIKE '%to-let%'
  )`;
}

/**
 * Rent detection for filters + price caps.
 * Many RealEthio / EthiopiaRealty rows lost property_status; titles still say "For Rent".
 */
function rentalStatusSql() {
  return `(
    ${rentalStatusColumnSql()}
    OR (
      TRIM(COALESCE(property_status, '')) = ''
      AND (
        LOWER(COALESCE(title, '')) LIKE '%for rent%'
        OR LOWER(COALESCE(title, '')) LIKE '%to let%'
        OR LOWER(COALESCE(title, '')) LIKE '%to-let%'
        OR LOWER(COALESCE(title, '')) LIKE '%for lease%'
        OR LOWER(COALESCE(detail_url, '')) LIKE '%for-rent%'
        OR LOWER(COALESCE(detail_url, '')) LIKE '%to-let%'
      )
    )
  )`;
}

/** Title/URL sale cues when property_status is empty. */
function saleTitleFallbackSql() {
  return `(
    LOWER(COALESCE(title, '')) LIKE '%for sale%'
    OR LOWER(COALESCE(title, '')) LIKE '%urgent sale%'
    OR LOWER(COALESCE(title, '')) LIKE '% in sale%'
    OR LOWER(COALESCE(title, '')) LIKE '%sale %'
    OR LOWER(COALESCE(title, '')) LIKE '% sale'
    OR LOWER(COALESCE(detail_url, '')) LIKE '%for-sale%'
    OR LOWER(COALESCE(detail_url, '')) LIKE '%urgent-sale%'
    OR LOWER(COALESCE(detail_url, '')) LIKE '%-in-sale%'
  )`;
}

/**
 * Sale detection for listing_mode=for_sale.
 * Prefer status; fall back to title/URL; EthiopiaRealty defaults to sale when not clearly rent.
 */
function saleStatusSql() {
  return `(
    LOWER(COALESCE(property_status, '')) LIKE '%sale%'
    OR (
      TRIM(COALESCE(property_status, '')) = ''
      AND NOT (${rentalStatusSql()})
      AND (
        ${saleTitleFallbackSql()}
        OR LOWER(COALESCE(source_website, '')) = 'ethiopiarealty.com'
      )
    )
  )`;
}

/**
 * Infer For Rent / For Sale from free text (title, URL, etc.).
 * @param {string} text
 * @param {{ sourceWebsite?: string }} [opts]
 * @returns {"For Rent"|"For Sale"|null}
 */
function inferListingStatusFromText(text, opts = {}) {
  const t = String(text || "").toLowerCase();
  if (!t.trim() && !opts.sourceWebsite) return null;
  const rent =
    /\bfor\s*rent\b/.test(t) ||
    /\bto[\s-]?let\b/.test(t) ||
    /\bfor\s*lease\b/.test(t) ||
    /\/to-let\//.test(t) ||
    /for-rent/.test(t);
  const sale =
    /\bfor\s*sale\b/.test(t) ||
    /\burgent\s+sale\b/.test(t) ||
    /\bin\s+sale\b/.test(t) ||
    /\/for-sale\//.test(t) ||
    /urgent-sale/.test(t) ||
    /(?:^|[^a-z])sale(?:[^a-z]|$)/.test(t);
  if (rent && !sale) return "For Rent";
  if (sale && !rent) return "For Sale";
  if (rent) return "For Rent";
  if (sale) return "For Sale";
  // EthiopiaRealty inventory is overwhelmingly for sale when status/title omit the mode.
  if (String(opts.sourceWebsite || "").toLowerCase() === "ethiopiarealty.com") {
    return "For Sale";
  }
  return null;
}

/**
 * Hide absurd prices from public search.
 * Prefer ETB when present — a stale/wrong price_usd must not hide a valid ETB price.
 * - Rent: hide below ~ETB 8k/mo (typos like 2,500) and above ~USD 50k/mo
 * - Sale: hide below ETB 500k and above ETB 500M (Addis luxury often 30M–200M+)
 */
function priceCapClause(etbPerUsd = Number(process.env.FX_ETB_USD || 130)) {
  const usd = usdEstimateSql(etbPerUsd);
  const etb = `COALESCE(price_etb, price)`;
  return `NOT (
    (${rentalStatusSql()} AND (
      (${usd} IS NOT NULL AND ${usd} > 50000)
      OR (
        CASE
          WHEN ${etb} IS NOT NULL AND ${etb} > 0 THEN (${etb} < 8000)
          ELSE (${usd} IS NOT NULL AND ${usd} > 0 AND ${usd} < 80)
        END
      )
    ))
    OR
    (NOT ${rentalStatusSql()} AND (
      (${etb} IS NOT NULL AND ${etb} > 500000000)
      OR (
        CASE
          WHEN ${etb} IS NOT NULL AND ${etb} > 0 THEN (${etb} < 500000)
          ELSE (${usd} IS NOT NULL AND ${usd} > 0 AND ${usd} < 4000)
        END
      )
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
  rentalStatusSql,
  saleStatusSql,
  inferListingStatusFromText
};
