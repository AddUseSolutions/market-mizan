/**
 * District market indexes for the 11 Addis Ababa sub-cities.
 * Unified on canonical_area, USD only, split by property class (apartment / house / …)
 * and listing mode (rent / sale). Daily snapshots power month-over-month variation.
 */
const { query, dialect } = require("../db/connection");
const { CANONICAL_AREAS } = require("./canonicalAreas");
const { rentalStatusSql, saleStatusSql, usdEstimateSql } = require("./listingFilters");
const { getEtbPerUsd } = require("./fxRate");
const { formatListingRef } = require("./listingRef");
const { cleanTitle } = require("./cleanTitle");

const PROPERTY_CLASSES = ["apartment", "house", "land", "office", "shop", "other"];
const LISTING_MODES = ["rent", "sale"];
/** Primary ticker / dashboard datasets (land / office / shop follow later). */
const PRIMARY_CLASSES = ["apartment", "house"];
/** Need at least two priced+sized listings before publishing a district USD/m² (avoids single-outlier spikes). */
const MIN_PPS_SAMPLES = 2;

function propertyClassSql() {
  const t = `LOWER(CONCAT(COALESCE(property_type, ''), ' ', COALESCE(title, '')))`;
  return `CASE
    WHEN ${t} LIKE '%land%' OR ${t} LIKE '%plot%' OR ${t} LIKE '%agricultural%' OR ${t} LIKE '%farm %' OR ${t} LIKE '% farm%'
      THEN 'land'
    WHEN ${t} LIKE '%office%' THEN 'office'
    WHEN ${t} LIKE '%shop%' OR ${t} LIKE '%retail%' OR ${t} LIKE '%store%' THEN 'shop'
    WHEN ${t} LIKE '%warehouse%' OR ${t} LIKE '%industrial%' OR ${t} LIKE '%hotel%' THEN 'other'
    WHEN ${t} LIKE '%apartment%' OR ${t} LIKE '%condo%' OR ${t} LIKE '%flat%' OR ${t} LIKE '%studio%'
      THEN 'apartment'
    WHEN ${t} LIKE '%villa%' OR ${t} LIKE '%townhouse%' OR ${t} LIKE '%duplex%'
      OR ${t} LIKE '%g+%' OR ${t} LIKE '%g +%'
      OR (${t} LIKE '%house%' AND ${t} NOT LIKE '%warehouse%') THEN 'house'
    ELSE 'other'
  END`;
}

/** Living area for built property; land area for plots. */
function areaM2Sql(classExpr) {
  return `CASE
    WHEN ${classExpr} = 'land' THEN COALESCE(NULLIF(land_area_m2, 0), NULLIF(property_size_m2, 0))
    ELSE COALESCE(NULLIF(property_size_m2, 0), NULLIF(land_area_m2, 0))
  END`;
}

function listingModeSql() {
  return `CASE
    WHEN ${rentalStatusSql()} THEN 'rent'
    WHEN ${saleStatusSql()} THEN 'sale'
    ELSE NULL
  END`;
}

function districtSql() {
  return `TRIM(COALESCE(NULLIF(canonical_area, ''), 'Unassigned'))`;
}

async function ensureMarketIndexSchema() {
  if (dialect === "postgres") {
    await query(`
      CREATE TABLE IF NOT EXISTS market_index_snapshots (
        snapshot_date DATE NOT NULL,
        district VARCHAR(80) NOT NULL,
        property_class VARCHAR(20) NOT NULL,
        listing_mode VARCHAR(10) NOT NULL,
        listing_count INT NOT NULL DEFAULT 0,
        with_pps INT NOT NULL DEFAULT 0,
        avg_price_usd NUMERIC(15,2),
        avg_pps_usd NUMERIC(15,4),
        PRIMARY KEY (snapshot_date, district, property_class, listing_mode)
      )
    `);
    await query("CREATE INDEX IF NOT EXISTS idx_market_index_date ON market_index_snapshots (snapshot_date)");
    return;
  }
  await query(`
    CREATE TABLE IF NOT EXISTS market_index_snapshots (
      snapshot_date DATE NOT NULL,
      district VARCHAR(80) NOT NULL,
      property_class VARCHAR(20) NOT NULL,
      listing_mode VARCHAR(10) NOT NULL,
      listing_count INT NOT NULL DEFAULT 0,
      with_pps INT NOT NULL DEFAULT 0,
      avg_price_usd DECIMAL(15,2) NULL,
      avg_pps_usd DECIMAL(15,4) NULL,
      PRIMARY KEY (snapshot_date, district, property_class, listing_mode),
      KEY idx_market_index_date (snapshot_date)
    )
  `);
}

/**
 * Live indexes from currently active listings (inactive / removed ads are excluded).
 * Only listings with a known district, class and rent/sale mode are counted.
 */
async function computeLiveBuckets() {
  const etbPerUsd = getEtbPerUsd();
  const usd = usdEstimateSql(etbPerUsd);
  const classExpr = propertyClassSql();
  const modeExpr = listingModeSql();
  const districtExpr = districtSql();
  const areaExpr = areaM2Sql(classExpr);
  const pps = `(${usd}) / NULLIF(${areaExpr}, 0)`;

  const sql = `
    SELECT ${districtExpr} AS district,
           ${classExpr} AS property_class,
           ${modeExpr} AS listing_mode,
           COUNT(*) AS listing_count,
           SUM(CASE WHEN ${usd} IS NOT NULL AND ${areaExpr} IS NOT NULL AND ${areaExpr} > 0 THEN 1 ELSE 0 END) AS with_pps,
           AVG(CASE WHEN ${usd} IS NOT NULL THEN ${usd} END) AS avg_price_usd,
           AVG(CASE WHEN ${usd} IS NOT NULL AND ${areaExpr} IS NOT NULL AND ${areaExpr} > 0 THEN ${pps} END) AS avg_pps_usd
    FROM properties
    WHERE is_active = TRUE
      AND ${districtExpr} <> 'Unassigned'
      AND ${modeExpr} IS NOT NULL
    GROUP BY 1, 2, 3
  `;
  const [rows] = await query(sql);
  return (rows || []).map((r) => ({
    district: r.district,
    property_class: r.property_class,
    listing_mode: r.listing_mode,
    listing_count: Number(r.listing_count) || 0,
    with_pps: Number(r.with_pps) || 0,
    avg_price_usd: r.avg_price_usd != null ? Number(r.avg_price_usd) : null,
    avg_pps_usd: r.avg_pps_usd != null && Number(r.with_pps) >= MIN_PPS_SAMPLES ? Number(r.avg_pps_usd) : null
  }));
}

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(dateStr) {
  return String(dateStr || "").slice(0, 7);
}

function pctChange(current, previous) {
  if (current == null || previous == null || !Number.isFinite(previous) || previous === 0) return null;
  return (Number(current) - Number(previous)) / Number(previous);
}

async function upsertSnapshots(buckets, snapshotDate = todayUtcDate()) {
  if (!buckets.length) return 0;
  let written = 0;
  for (const b of buckets) {
    const params = [
      snapshotDate,
      b.district,
      b.property_class,
      b.listing_mode,
      b.listing_count,
      b.with_pps,
      b.avg_price_usd,
      b.avg_pps_usd
    ];
    if (dialect === "postgres") {
      await query(
        `INSERT INTO market_index_snapshots
           (snapshot_date, district, property_class, listing_mode, listing_count, with_pps, avg_price_usd, avg_pps_usd)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (snapshot_date, district, property_class, listing_mode) DO UPDATE SET
           listing_count = EXCLUDED.listing_count,
           with_pps = EXCLUDED.with_pps,
           avg_price_usd = EXCLUDED.avg_price_usd,
           avg_pps_usd = EXCLUDED.avg_pps_usd`,
        params
      );
    } else {
      await query(
        `INSERT INTO market_index_snapshots
           (snapshot_date, district, property_class, listing_mode, listing_count, with_pps, avg_price_usd, avg_pps_usd)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           listing_count = VALUES(listing_count),
           with_pps = VALUES(with_pps),
           avg_price_usd = VALUES(avg_price_usd),
           avg_pps_usd = VALUES(avg_pps_usd)`,
        params
      );
    }
    written += 1;
  }
  return written;
}

async function snapshotMarketIndexes() {
  await ensureMarketIndexSchema();
  const buckets = await computeLiveBuckets();
  const written = await upsertSnapshots(buckets);
  try {
    require("./memoryCache").invalidateCache("market-index-report");
    require("./memoryCache").invalidateCache("dashboard-stats-full");
  } catch {
    /* cache optional */
  }
  return { date: todayUtcDate(), buckets: written };
}

async function loadSnapshotsNear(targetDate) {
  const [exact] = await query(
    `SELECT * FROM market_index_snapshots WHERE snapshot_date = ?`,
    [targetDate]
  );
  if (exact?.length) return { date: targetDate, rows: exact };

  const [before] = await query(
    `SELECT * FROM market_index_snapshots
     WHERE snapshot_date <= ?
     ORDER BY snapshot_date DESC LIMIT 500`,
    [targetDate]
  );
  if (!before?.length) return null;
  const date = String(before[0].snapshot_date).slice(0, 10);
  return { date, rows: before.filter((r) => String(r.snapshot_date).slice(0, 10) === date) };
}

function bucketKey(b) {
  return `${b.district}|${b.property_class}|${b.listing_mode}`;
}

function normalizeSnapRow(r) {
  return {
    district: r.district,
    property_class: r.property_class,
    listing_mode: r.listing_mode,
    listing_count: Number(r.listing_count) || 0,
    with_pps: Number(r.with_pps) || 0,
    avg_price_usd: r.avg_price_usd != null ? Number(r.avg_price_usd) : null,
    avg_pps_usd: r.avg_pps_usd != null ? Number(r.avg_pps_usd) : null
  };
}

/**
 * Build full report: live buckets + MoM vs ~30 days ago (or previous calendar month snapshot).
 */
async function buildMarketIndexReport() {
  await ensureMarketIndexSchema();
  const live = await computeLiveBuckets();
  const liveMap = new Map(live.map((b) => [bucketKey(b), b]));

  const today = todayUtcDate();
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 30);
  const targetPrev = d.toISOString().slice(0, 10);

  let previous = null;
  try {
    previous = await loadSnapshotsNear(targetPrev);
    if (!previous) {
      // Fall back to latest snapshot from a prior calendar month.
      const [rows] = await query(
        `SELECT * FROM market_index_snapshots
         WHERE snapshot_date < ?
         ORDER BY snapshot_date DESC LIMIT 500`,
        [`${monthKey(today)}-01`]
      );
      if (rows?.length) {
        const date = String(rows[0].snapshot_date).slice(0, 10);
        previous = { date, rows: rows.filter((r) => String(r.snapshot_date).slice(0, 10) === date) };
      }
    }
  } catch {
    previous = null;
  }

  const prevMap = new Map((previous?.rows || []).map((r) => [bucketKey(r), normalizeSnapRow(r)]));

  function enrich(b) {
    const prev = prevMap.get(bucketKey(b));
    return {
      ...b,
      mom_pps_pct: pctChange(b.avg_pps_usd, prev?.avg_pps_usd),
      mom_count_pct: pctChange(b.listing_count, prev?.listing_count),
      prev_listing_count: prev?.listing_count ?? null,
      prev_avg_pps_usd: prev?.avg_pps_usd ?? null
    };
  }

  const indexes = [];
  for (const district of CANONICAL_AREAS) {
    for (const property_class of PROPERTY_CLASSES) {
      for (const listing_mode of LISTING_MODES) {
        const key = `${district}|${property_class}|${listing_mode}`;
        const liveRow = liveMap.get(key) || {
          district,
          property_class,
          listing_mode,
          listing_count: 0,
          with_pps: 0,
          avg_price_usd: null,
          avg_pps_usd: null
        };
        indexes.push(enrich(liveRow));
      }
    }
  }

  // Monthly history for charts (last 12 calendar months of daily snapshots → last per month).
  let history = [];
  try {
    const monthExpr =
      dialect === "postgres"
        ? `to_char(snapshot_date, 'YYYY-MM')`
        : `DATE_FORMAT(snapshot_date, '%Y-%m')`;
    const [histRows] = await query(
      `SELECT ${monthExpr} AS month, district, property_class, listing_mode,
              listing_count, avg_pps_usd, avg_price_usd, snapshot_date
       FROM market_index_snapshots
       WHERE snapshot_date >= ?
       ORDER BY snapshot_date ASC`,
      [new Date(Date.now() - 400 * 86400e3).toISOString().slice(0, 10)]
    );
    const lastByMonth = new Map();
    for (const r of histRows || []) {
      lastByMonth.set(`${r.month}|${bucketKey(r)}`, normalizeSnapRow({ ...r, snapshot_date: r.snapshot_date }));
    }
    history = [...lastByMonth.entries()].map(([k, v]) => {
      const month = k.split("|")[0];
      return { month, ...v };
    });
  } catch {
    history = [];
  }

  return {
    generatedAt: new Date().toISOString(),
    currency: "USD",
    districts: CANONICAL_AREAS,
    propertyClasses: PROPERTY_CLASSES,
    primaryClasses: PRIMARY_CLASSES,
    compareDate: previous?.date || null,
    fxRateEtbPerUsd: getEtbPerUsd(),
    indexes,
    history
  };
}

/** Compact payload for the public top-of-site ticker. */
function tickerFromReport(report, { propertyClass = "apartment", listingMode = "rent" } = {}) {
  const cls = PRIMARY_CLASSES.includes(propertyClass) ? propertyClass : "apartment";
  const mode = LISTING_MODES.includes(listingMode) ? listingMode : "rent";
  const items = report.indexes
    .filter((i) => i.property_class === cls && i.listing_mode === mode && i.listing_count > 0)
    .map((i) => ({
      district: i.district,
      avgPpsUsd: i.avg_pps_usd != null ? Math.round(i.avg_pps_usd * 100) / 100 : null,
      listingCount: i.listing_count,
      momPpsPct: i.mom_pps_pct,
      momCountPct: i.mom_count_pct
    }))
    .sort((a, b) => (b.avgPpsUsd || 0) - (a.avgPpsUsd || 0) || b.listingCount - a.listingCount);

  return {
    generatedAt: report.generatedAt,
    propertyClass: cls,
    listingMode: mode,
    unit: cls === "land" ? "USD/m² land" : "USD/m² living",
    compareDate: report.compareDate,
    items,
    datasets: PRIMARY_CLASSES.flatMap((c) =>
      LISTING_MODES.map((m) => ({
        propertyClass: c,
        listingMode: m,
        label: `${c === "apartment" ? "Apartment" : "House"} · ${m === "rent" ? "Rent" : "Sale"}`
      }))
    )
  };
}

function csvEscape(value) {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function classifyPropertyJs(row) {
  const t = `${row.property_type || ""} ${row.title || ""}`.toLowerCase();
  if (/land|plot|agricultural|\bfarm\b/.test(t)) return "land";
  if (/office/.test(t)) return "office";
  if (/shop|retail|\bstore\b/.test(t)) return "shop";
  if (/warehouse|industrial|\bhotel\b/.test(t)) return "other";
  if (/apartment|condo|flat|studio/.test(t)) return "apartment";
  if (/villa|townhouse|duplex|g\+|g \+|\bhouse\b/.test(t)) return "house";
  return "other";
}

function listingModeJs(row) {
  const status = String(row.property_status || "").toLowerCase();
  if (status.includes("rent") || status.includes("to let") || status.includes("to-let")) return "rent";
  if (status.includes("sale")) return "sale";
  const title = String(row.title || "").toLowerCase();
  if (/for rent|to[\s-]?let|for lease/.test(title)) return "rent";
  if (/for sale|urgent sale/.test(title)) return "sale";
  if (String(row.source_website || "").toLowerCase() === "ethiopiarealty.com") return "sale";
  return "";
}

/** Streamable CSV of the cleaned analysis dataset (Excel-friendly UTF-8 BOM). */
async function buildPropertiesExportCsv() {
  const etbPerUsd = getEtbPerUsd();
  const [rows] = await query(
    `SELECT id, property_id, title, canonical_area, location_area, location_district, location_city,
            property_type, property_status, price_usd, price_etb, property_size_m2, land_area_m2,
            bedrooms, bathrooms, furnished, source_website, source_name, listing_origin, is_active,
            first_seen, last_seen, detail_url, hmlo_score, created_at
     FROM properties
     ORDER BY is_active DESC, canonical_area ASC, id ASC`
  );

  const header = [
    "listing_ref",
    "property_id",
    "title",
    "canonical_area",
    "location_area",
    "location_district",
    "location_city",
    "property_class",
    "property_type_raw",
    "listing_mode",
    "property_status",
    "price_usd",
    "price_etb",
    "living_area_m2",
    "land_area_m2",
    "area_m2_used",
    "usd_per_sqm",
    "bedrooms",
    "bathrooms",
    "furnished",
    "source_website",
    "source_name",
    "listing_origin",
    "is_active",
    "first_seen",
    "last_seen",
    "detail_url",
    "hmlo_score"
  ];

  const lines = [`\uFEFF${header.join(",")}`];
  for (const r of rows || []) {
    const propertyClass = classifyPropertyJs(r);
    const mode = listingModeJs(r);
    let priceUsd = r.price_usd != null ? Number(r.price_usd) : null;
    if ((priceUsd == null || !priceUsd) && r.price_etb != null && etbPerUsd) {
      priceUsd = Number(r.price_etb) / etbPerUsd;
    }
    const living = r.property_size_m2 != null ? Number(r.property_size_m2) : null;
    const land = r.land_area_m2 != null ? Number(r.land_area_m2) : null;
    const areaUsed = propertyClass === "land" ? land || living : living || land;
    const pps = priceUsd && areaUsed && areaUsed > 0 ? priceUsd / areaUsed : null;
    const cols = [
      formatListingRef(r.id),
      r.property_id,
      cleanTitle(r.title) || r.title,
      r.canonical_area,
      r.location_area,
      r.location_district,
      r.location_city,
      propertyClass,
      r.property_type,
      mode,
      r.property_status,
      priceUsd != null ? Math.round(priceUsd * 100) / 100 : "",
      r.price_etb != null ? Number(r.price_etb) : "",
      living ?? "",
      land ?? "",
      areaUsed ?? "",
      pps != null ? Math.round(pps * 100) / 100 : "",
      r.bedrooms ?? "",
      r.bathrooms ?? "",
      r.furnished ?? "",
      r.source_website,
      r.source_name,
      r.listing_origin,
      r.is_active ? 1 : 0,
      r.first_seen ? new Date(r.first_seen).toISOString() : "",
      r.last_seen ? new Date(r.last_seen).toISOString() : "",
      r.detail_url,
      r.hmlo_score
    ];
    lines.push(cols.map(csvEscape).join(","));
  }
  return lines.join("\n");
}

function startMarketIndexSnapshots() {
  const run = () =>
    snapshotMarketIndexes().catch((e) => console.error("Market index snapshot failed:", e.message));
  // Baseline snapshot soon after boot so MoM has a reference point going forward.
  setTimeout(run, 45 * 1000).unref();
  setInterval(run, 12 * 3600 * 1000).unref();
}

module.exports = {
  PROPERTY_CLASSES,
  PRIMARY_CLASSES,
  LISTING_MODES,
  ensureMarketIndexSchema,
  computeLiveBuckets,
  snapshotMarketIndexes,
  buildMarketIndexReport,
  tickerFromReport,
  buildPropertiesExportCsv,
  startMarketIndexSnapshots,
  propertyClassSql,
  classifyPropertyJs,
  pctChange
};
