/**
 * HMLO: High / Medium / Low / Opportunity based on price per m² vs area median.
 * Medians are computed per sub-city (canonical_area) AND listing type (rent vs sale), min. 3 listings.
 */
const {
  usdEstimateSql,
  listingModeSql,
  propertyClassSql,
  areaM2Sql,
  publicCatalogWhereSql,
  listingModeJs,
  ppsUsdOfListing,
  MAX_PPS_RENT_USD,
  MAX_PPS_SALE_USD
} = require("./listingFilters");
const { getEtbPerUsd } = require("./fxRate");
const MIN_MEDIAN_SAMPLE_SIZE = 3;
const DEFAULT_AREA = "Addis Ababa";

/** Prefer official sub-city; fall back to raw area / district. */
const AREA_EXPR = `TRIM(COALESCE(NULLIF(canonical_area, ''), NULLIF(location_area, ''), NULLIF(location_district, ''), '${DEFAULT_AREA}'))`;

const MODE_SQL = listingModeSql();
const AREA_M2_SQL = areaM2Sql(propertyClassSql(), MODE_SQL);
const USD_SQL = usdEstimateSql(getEtbPerUsd());
const PPS_SQL = `(${USD_SQL}) / NULLIF(${AREA_M2_SQL}, 0)`;

function medianEligibleWhere(dialect) {
  return `
    ${publicCatalogWhereSql(dialect)}
    AND ${MODE_SQL} IS NOT NULL
    AND ${AREA_M2_SQL} > 0
    AND ${PPS_SQL} > 0
    AND ${PPS_SQL} <= CASE WHEN ${MODE_SQL} = 'rent' THEN ${MAX_PPS_RENT_USD} ELSE ${MAX_PPS_SALE_USD} END
  `;
}

function resolveListingType(property) {
  return listingModeJs(property) || null;
}

function medianMapKey(area, listingType) {
  return `${area}|${listingType}`;
}

function lookupAreaMedian(areaMedians, area, listingType) {
  if (!listingType) return null;
  const trimmed = (area || DEFAULT_AREA).trim() || DEFAULT_AREA;
  return (
    areaMedians[medianMapKey(trimmed, listingType)] ??
    areaMedians[medianMapKey(DEFAULT_AREA, listingType)] ??
    null
  );
}

function buildMedianMap(rows) {
  const map = {};
  for (const r of rows || []) {
    const m = Number(r.median_pps);
    if (r.area && r.listing_type && Number.isFinite(m)) {
      map[medianMapKey(r.area, r.listing_type)] = m;
    }
  }
  return map;
}

function computePricePerSqmUsd(property) {
  const pps = ppsUsdOfListing(property, getEtbPerUsd());
  return pps == null ? null : Math.round(pps * 100) / 100;
}

function computeHmloScore(pps, areaMedianPps) {
  if (pps == null || areaMedianPps == null || areaMedianPps <= 0) return "medium";
  const ratio = pps / areaMedianPps;
  if (ratio <= 0.85) return "opportunity";
  if (ratio <= 0.95) return "low";
  if (ratio <= 1.1) return "medium";
  return "high";
}

function normalizeNeighborhoodRow(r) {
  return {
    area: r.area,
    listing_type: r.listing_type,
    listing_count: Number(r.listing_count) || 0,
    avg_price_usd: r.avg_price_usd != null ? Number(r.avg_price_usd) : null,
    median_pps_usd: r.median_pps_usd != null ? Number(r.median_pps_usd) : null,
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null
  };
}

function groupNeighborhoodStats(rows, { limitPerType = 80 } = {}) {
  const rent = [];
  const sale = [];
  for (const r of rows || []) {
    const item = normalizeNeighborhoodRow(r);
    if (item.listing_type === "rent") rent.push(item);
    else if (item.listing_type === "sale") sale.push(item);
  }
  const byCount = (a, b) => b.listing_count - a.listing_count;
  rent.sort(byCount);
  sale.sort(byCount);
  return {
    rent: rent.slice(0, limitPerType),
    sale: sale.slice(0, limitPerType),
    minSampleSize: MIN_MEDIAN_SAMPLE_SIZE
  };
}

async function fetchNeighborhoodStats(dbQuery, dialect) {
  const sql =
    dialect === "postgres"
      ? `
    SELECT ${AREA_EXPR} AS area,
           ${MODE_SQL} AS listing_type,
           COUNT(*)::int AS listing_count,
           ROUND(AVG(${usdEstimateSql(getEtbPerUsd())})::numeric, 2) AS avg_price_usd,
           ROUND(
             (PERCENTILE_CONT(0.5) WITHIN GROUP (
               ORDER BY ${PPS_SQL}
             ))::numeric,
             2
           ) AS median_pps_usd,
           ROUND(AVG(latitude)::numeric, 6) AS lat,
           ROUND(AVG(longitude)::numeric, 6) AS lng
    FROM properties
    WHERE ${medianEligibleWhere(dialect)}
    GROUP BY 1, 2
    HAVING COUNT(*) >= ${MIN_MEDIAN_SAMPLE_SIZE}
       AND ${MODE_SQL} IS NOT NULL
    ORDER BY listing_count DESC
    `
      : `
    SELECT ${AREA_EXPR} AS area,
           ${MODE_SQL} AS listing_type,
           COUNT(*) AS listing_count,
           ROUND(AVG(${usdEstimateSql(getEtbPerUsd())}), 2) AS avg_price_usd,
           ROUND(AVG(${PPS_SQL}), 2) AS median_pps_usd,
           ROUND(AVG(latitude), 6) AS lat,
           ROUND(AVG(longitude), 6) AS lng
    FROM properties
    WHERE ${medianEligibleWhere(dialect)}
    GROUP BY 1, 2
    HAVING COUNT(*) >= ${MIN_MEDIAN_SAMPLE_SIZE}
       AND ${MODE_SQL} IS NOT NULL
    ORDER BY listing_count DESC
    `;
  const [rows] = await dbQuery(sql);
  return rows;
}

async function fetchAreaMedians(query) {
  const [rows] = await query(
    `
    SELECT ${AREA_EXPR} AS area,
           ${MODE_SQL} AS listing_type,
           PERCENTILE_CONT(0.5) WITHIN GROUP (
             ORDER BY ${PPS_SQL}
           ) AS median_pps
    FROM properties
    WHERE ${medianEligibleWhere("postgres")}
    GROUP BY 1, 2
    HAVING COUNT(*) >= ${MIN_MEDIAN_SAMPLE_SIZE}
       AND ${MODE_SQL} IS NOT NULL
    `
  );
  return buildMedianMap(rows);
}

/** MySQL fallback without PERCENTILE_CONT — uses AVG as approximate median. */
async function fetchAreaMediansMysql(query) {
  const [rows] = await query(
    `
    SELECT ${AREA_EXPR} AS area,
           ${MODE_SQL} AS listing_type,
           AVG(${PPS_SQL}) AS median_pps
    FROM properties
    WHERE ${medianEligibleWhere("mysql")}
    GROUP BY 1, 2
    HAVING COUNT(*) >= ${MIN_MEDIAN_SAMPLE_SIZE}
       AND ${MODE_SQL} IS NOT NULL
    `
  );
  return buildMedianMap(rows);
}

function enrichWithHmlo(property, areaMedians) {
  const pps = computePricePerSqmUsd(property);
  const area = (
    property.canonical_area ||
    property.location_area ||
    property.location_district ||
    DEFAULT_AREA
  ).trim();
  const listingType = resolveListingType(property);
  const median = lookupAreaMedian(areaMedians, area, listingType);
  const hmlo_score = computeHmloScore(pps, median);
  return {
    ...property,
    price_per_sqm_usd: pps,
    hmlo_score,
    hmlo_listing_type: listingType,
    area_median_pps_usd: median
  };
}

module.exports = {
  MIN_MEDIAN_SAMPLE_SIZE,
  DEFAULT_AREA,
  AREA_EXPR,
  resolveListingType,
  medianMapKey,
  lookupAreaMedian,
  computePricePerSqmUsd,
  computeHmloScore,
  fetchAreaMedians,
  fetchAreaMediansMysql,
  fetchNeighborhoodStats,
  groupNeighborhoodStats,
  enrichWithHmlo
};
