const { query, dialect } = require("../db/connection");
const { getEtbPerUsd } = require("../utils/fxRate");
const { CANONICAL_AREAS } = require("../utils/canonicalAreas");
const { publicCatalogWhereSql, listingModeSql, usdEstimateSql } = require("../utils/listingFilters");

const BOUNDS = { minLat: 8.75, maxLat: 9.15, minLng: 38.55, maxLng: 39.05 };

function areaExpr() {
  return `TRIM(COALESCE(NULLIF(canonical_area, ''), 'Unassigned'))`;
}

function onMapSql() {
  return `latitude BETWEEN ${BOUNDS.minLat} AND ${BOUNDS.maxLat}
    AND longitude BETWEEN ${BOUNDS.minLng} AND ${BOUNDS.maxLng}`;
}

function emptyDistrict(area) {
  return { area, total: 0, rent: 0, sale: 0, other: 0, onMap: 0 };
}

function foldDistrictRows(rows) {
  const byArea = new Map(CANONICAL_AREAS.map((area) => [area, emptyDistrict(area)]));
  for (const row of rows || []) {
    const area = String(row.area || "Unassigned");
    if (!byArea.has(area)) byArea.set(area, emptyDistrict(area));
    const bucket = byArea.get(area);
    const n = Number(row.n) || 0;
    const mode = row.mode === "rent" || row.mode === "sale" ? row.mode : "other";
    bucket[mode] += n;
    bucket.total += n;
    bucket.onMap += Number(row.on_map) || 0;
  }
  const ordered = CANONICAL_AREAS.map((area) => byArea.get(area));
  for (const [area, bucket] of byArea) {
    if (!CANONICAL_AREAS.includes(area) && bucket.total > 0) ordered.push(bucket);
  }
  return ordered;
}

async function getListingMap(req, res, next) {
  try {
    const where = publicCatalogWhereSql(dialect);
    const mode = listingModeSql();
    const area = areaExpr();
    const [countRows] = await query(
      `SELECT ${area} AS area, ${mode} AS mode, COUNT(*) AS n,
              SUM(CASE WHEN ${onMapSql()} THEN 1 ELSE 0 END) AS on_map
       FROM properties
       WHERE ${where}
       GROUP BY ${area}, ${mode}`
    );
    const [pinRows] = await query(
      `SELECT property_id, title, latitude, longitude,
              ${area} AS area, ${mode} AS mode,
              ROUND(${usdEstimateSql(getEtbPerUsd())}) AS price_usd
       FROM properties
       WHERE ${where}
         AND ${onMapSql()}
       ORDER BY property_id
       LIMIT 4000`
    );
    const pins = (pinRows || []).map((row) => ({
      id: row.property_id,
      title: String(row.title || "").slice(0, 90),
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      area: row.area || "Unassigned",
      mode: row.mode === "rent" || row.mode === "sale" ? row.mode : "other",
      priceUsd: row.price_usd == null ? null : Number(row.price_usd)
    })).filter((pin) => Number.isFinite(pin.lat) && Number.isFinite(pin.lng));

    const districts = foldDistrictRows(countRows);
    const totals = districts.reduce(
      (sum, district) => {
        sum.total += district.total;
        sum.onMap += district.onMap;
        return sum;
      },
      { total: 0, onMap: 0 }
    );
    res.json({ districts, pins, totals });
  } catch (error) {
    next(error);
  }
}

module.exports = { getListingMap, foldDistrictRows };
