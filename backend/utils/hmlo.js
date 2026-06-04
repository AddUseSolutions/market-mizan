/**
 * HMLO: High / Medium / Low / Opportunity based on price per m² vs area median.
 * Medians are computed per area AND listing type (rent vs sale), min. 3 listings.
 */
const MIN_MEDIAN_SAMPLE_SIZE = 3;
const DEFAULT_AREA = "Addis Ababa";

const LISTING_TYPE_SQL = `
  CASE
    WHEN LOWER(COALESCE(property_status, '')) LIKE '%rent%' THEN 'rent'
    WHEN LOWER(COALESCE(property_status, '')) LIKE '%sale%' THEN 'sale'
    ELSE NULL
  END
`;

function resolveListingType(property) {
  const status = String(property?.property_status || "").toLowerCase();
  const mode = String(property?.listing_mode || "").toLowerCase();
  if (status.includes("rent") || mode === "for_rent") return "rent";
  if (status.includes("sale") || mode === "for_sale") return "sale";
  return null;
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
  const usd = property.price_usd != null ? Number(property.price_usd) : null;
  const size = Number(property.property_size_m2);
  if (!Number.isFinite(usd) || !Number.isFinite(size) || size <= 0) return null;
  return Math.round((usd / size) * 100) / 100;
}

function computeHmloScore(pps, areaMedianPps) {
  if (pps == null || areaMedianPps == null || areaMedianPps <= 0) return "medium";
  const ratio = pps / areaMedianPps;
  if (ratio <= 0.85) return "opportunity";
  if (ratio <= 0.95) return "low";
  if (ratio <= 1.1) return "medium";
  return "high";
}

const MEDIAN_ELIGIBLE_WHERE = `
  is_active = TRUE
  AND price_usd IS NOT NULL
  AND property_size_m2 > 0
  AND (
    LOWER(COALESCE(property_status, '')) LIKE '%rent%'
    OR LOWER(COALESCE(property_status, '')) LIKE '%sale%'
  )
`;

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
    SELECT TRIM(COALESCE(location_area, location_district, '${DEFAULT_AREA}')) AS area,
           ${LISTING_TYPE_SQL} AS listing_type,
           COUNT(*)::int AS listing_count,
           ROUND(AVG(price_usd)::numeric, 2) AS avg_price_usd,
           ROUND(
             (PERCENTILE_CONT(0.5) WITHIN GROUP (
               ORDER BY price_usd / NULLIF(property_size_m2, 0)
             ))::numeric,
             2
           ) AS median_pps_usd,
           ROUND(AVG(latitude)::numeric, 6) AS lat,
           ROUND(AVG(longitude)::numeric, 6) AS lng
    FROM properties
    WHERE ${MEDIAN_ELIGIBLE_WHERE}
    GROUP BY 1, 2
    HAVING COUNT(*) >= ${MIN_MEDIAN_SAMPLE_SIZE}
       AND ${LISTING_TYPE_SQL} IS NOT NULL
    ORDER BY listing_count DESC
    `
      : `
    SELECT TRIM(COALESCE(location_area, location_district, '${DEFAULT_AREA}')) AS area,
           ${LISTING_TYPE_SQL} AS listing_type,
           COUNT(*) AS listing_count,
           ROUND(AVG(price_usd), 2) AS avg_price_usd,
           ROUND(AVG(price_usd / NULLIF(property_size_m2, 0)), 2) AS median_pps_usd,
           ROUND(AVG(latitude), 6) AS lat,
           ROUND(AVG(longitude), 6) AS lng
    FROM properties
    WHERE ${MEDIAN_ELIGIBLE_WHERE}
    GROUP BY 1, 2
    HAVING COUNT(*) >= ${MIN_MEDIAN_SAMPLE_SIZE}
       AND ${LISTING_TYPE_SQL} IS NOT NULL
    ORDER BY listing_count DESC
    `;
  const [rows] = await dbQuery(sql);
  return rows;
}

async function fetchAreaMedians(query) {
  const [rows] = await query(
    `
    SELECT TRIM(COALESCE(location_area, location_district, '${DEFAULT_AREA}')) AS area,
           ${LISTING_TYPE_SQL} AS listing_type,
           PERCENTILE_CONT(0.5) WITHIN GROUP (
             ORDER BY (price_usd / NULLIF(property_size_m2, 0))
           ) AS median_pps
    FROM properties
    WHERE ${MEDIAN_ELIGIBLE_WHERE}
    GROUP BY 1, 2
    HAVING COUNT(*) >= ${MIN_MEDIAN_SAMPLE_SIZE}
       AND ${LISTING_TYPE_SQL} IS NOT NULL
    `
  );
  return buildMedianMap(rows);
}

/** MySQL fallback without PERCENTILE_CONT — uses AVG as approximate median. */
async function fetchAreaMediansMysql(query) {
  const [rows] = await query(
    `
    SELECT TRIM(COALESCE(location_area, location_district, '${DEFAULT_AREA}')) AS area,
           ${LISTING_TYPE_SQL} AS listing_type,
           AVG(price_usd / NULLIF(property_size_m2, 0)) AS median_pps
    FROM properties
    WHERE ${MEDIAN_ELIGIBLE_WHERE}
    GROUP BY 1, 2
    HAVING COUNT(*) >= ${MIN_MEDIAN_SAMPLE_SIZE}
       AND ${LISTING_TYPE_SQL} IS NOT NULL
    `
  );
  return buildMedianMap(rows);
}

function enrichWithHmlo(property, areaMedians) {
  const pps = computePricePerSqmUsd(property);
  const area = (property.location_area || property.location_district || DEFAULT_AREA).trim();
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
