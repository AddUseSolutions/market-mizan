/**
 * HMLO: High / Medium / Low / Opportunity based on price per m² vs area median.
 */
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

async function fetchAreaMedians(query) {
  const [rows] = await query(`
    SELECT TRIM(COALESCE(location_area, location_district, 'Addis Ababa')) AS area,
           PERCENTILE_CONT(0.5) WITHIN GROUP (
             ORDER BY (price_usd / NULLIF(property_size_m2, 0))
           ) AS median_pps
    FROM properties
    WHERE is_active = TRUE
      AND price_usd IS NOT NULL
      AND property_size_m2 > 0
    GROUP BY 1
  `);
  const map = {};
  for (const r of rows || []) {
    const m = Number(r.median_pps);
    if (r.area && Number.isFinite(m)) map[r.area] = m;
  }
  return map;
}

/** MySQL fallback without PERCENTILE_CONT */
async function fetchAreaMediansMysql(query) {
  const [rows] = await query(`
    SELECT TRIM(COALESCE(location_area, location_district, 'Addis Ababa')) AS area,
           AVG(price_usd / NULLIF(property_size_m2, 0)) AS median_pps
    FROM properties
    WHERE is_active = TRUE AND price_usd IS NOT NULL AND property_size_m2 > 0
    GROUP BY 1
  `);
  const map = {};
  for (const r of rows || []) {
    const m = Number(r.median_pps);
    if (r.area && Number.isFinite(m)) map[r.area] = m;
  }
  return map;
}

function enrichWithHmlo(property, areaMedians) {
  const pps = computePricePerSqmUsd(property);
  const area = (property.location_area || property.location_district || "Addis Ababa").trim();
  const median = areaMedians[area] || areaMedians["Addis Ababa"] || null;
  const hmlo_score = computeHmloScore(pps, median);
  return {
    ...property,
    price_per_sqm_usd: pps,
    hmlo_score,
    area_median_pps_usd: median
  };
}

module.exports = {
  computePricePerSqmUsd,
  computeHmloScore,
  fetchAreaMedians,
  fetchAreaMediansMysql,
  enrichWithHmlo
};
