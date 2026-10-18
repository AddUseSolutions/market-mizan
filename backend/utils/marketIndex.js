/**
 * District market indexes for the 11 Addis Ababa sub-cities.
 * Unified on canonical_area, USD, split by property class (apartment / house / …)
 * and listing mode (rent / sale). Monthly snapshots power month-over-month variation.
 *
 * Area denominator (expert brief):
 *   - House sale → land_area_m2
 *   - Apt sale / house rent / apt rent → property_size_m2 (living)
 *   - Land class → land_area_m2
 *
 * Outlier filter: exclude listings with USD/m² above the mode cap (rent ≤ 50;
 * sale uses a higher cap so residential sale indexes are not wiped).
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
/** Expert UI order: Apt Rent → House Rent → Apt Sale → House Sale */
const PRIMARY_DATASETS = [
  { propertyClass: "apartment", listingMode: "rent", label: "Apt · Rent" },
  { propertyClass: "house", listingMode: "rent", label: "House · Rent" },
  { propertyClass: "apartment", listingMode: "sale", label: "Apt · Sale" },
  { propertyClass: "house", listingMode: "sale", label: "House · Sale" }
];
/** Need at least two priced+sized listings before publishing a district USD/m². */
const MIN_PPS_SAMPLES = 2;
/** Expert: exclude rent USD/m² above 50 (catches misclassified sales / bad sizes). */
const MAX_PPS_RENT_USD = 50;
/**
 * Sale median in Addis is ~$1k/m² — applying the rent cap of 50 would wipe sale indexes.
 * Cap extreme sale outliers only (above ~p99 of current inventory).
 */
const MAX_PPS_SALE_USD = 8000;
/** Show the five sub-cities with the most listings for the selected dataset. */
const TOP_DISTRICTS = 5;
/** Expert analysis window (inclusive calendar months). */
const ANALYSIS_WINDOW_START = "2026-04";
const ANALYSIS_WINDOW_END = "2026-09";

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

/**
 * Area used for USD/m².
 * House for sale → land area; everything else built → living/property size.
 */
function areaM2Sql(classExpr, modeExpr) {
  return `CASE
    WHEN ${classExpr} = 'land' THEN COALESCE(NULLIF(land_area_m2, 0), NULLIF(property_size_m2, 0))
    WHEN ${classExpr} = 'house' AND ${modeExpr} = 'sale'
      THEN COALESCE(NULLIF(land_area_m2, 0), NULLIF(property_size_m2, 0))
    ELSE COALESCE(NULLIF(property_size_m2, 0), NULLIF(land_area_m2, 0))
  END`;
}

function maxPpsSql(modeExpr) {
  return `CASE WHEN ${modeExpr} = 'rent' THEN ${MAX_PPS_RENT_USD} ELSE ${MAX_PPS_SALE_USD} END`;
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
 * Optional asOfDate reconstructs inventory as of that day via first_seen/last_seen.
 */
async function computeLiveBuckets({ asOfDate = null } = {}) {
  const etbPerUsd = getEtbPerUsd();
  const usd = usdEstimateSql(etbPerUsd);
  const classExpr = propertyClassSql();
  const modeExpr = listingModeSql();
  const districtExpr = districtSql();
  const areaExpr = areaM2Sql(classExpr, modeExpr);
  const pps = `(${usd}) / NULLIF(${areaExpr}, 0)`;
  const ppsOk = `${usd} IS NOT NULL AND ${areaExpr} IS NOT NULL AND ${areaExpr} > 0 AND (${pps}) > 0 AND (${pps}) <= (${maxPpsSql(modeExpr)})`;

  let visibilitySql = "is_active = TRUE";
  const params = [];
  if (asOfDate) {
    // Listing existed on asOfDate: first seen on/before, and still active or last seen on/after.
    visibilitySql = `first_seen <= ? AND (is_active = TRUE OR last_seen >= ?)`;
    params.push(`${asOfDate} 23:59:59`, `${asOfDate} 00:00:00`);
  }

  const sql = `
    SELECT ${districtExpr} AS district,
           ${classExpr} AS property_class,
           ${modeExpr} AS listing_mode,
           COUNT(*) AS listing_count,
           SUM(CASE WHEN ${ppsOk} THEN 1 ELSE 0 END) AS with_pps,
           AVG(CASE WHEN ${usd} IS NOT NULL THEN ${usd} END) AS avg_price_usd,
           AVG(CASE WHEN ${ppsOk} THEN ${pps} END) AS avg_pps_usd
    FROM properties
    WHERE ${visibilitySql}
      AND ${districtExpr} <> 'Unassigned'
      AND ${modeExpr} IS NOT NULL
    GROUP BY 1, 2, 3
  `;
  const [rows] = await query(sql, params);
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

function monthEndDate(ym) {
  const [y, m] = String(ym).split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 0)); // last day of month
  return d.toISOString().slice(0, 10);
}

function listMonthsInclusive(startYm, endYm) {
  const out = [];
  let [y, m] = String(startYm).split("-").map(Number);
  const [ey, em] = String(endYm).split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** Wipe snapshots and rebuild Apr→Sep window + today's live snapshot using current PPS rules. */
async function rebuildMarketIndexHistory() {
  await ensureMarketIndexSchema();
  await query(`DELETE FROM market_index_snapshots`);
  const today = todayUtcDate();
  const currentYm = monthKey(today);
  const endYm = currentYm < ANALYSIS_WINDOW_END ? currentYm : ANALYSIS_WINDOW_END;
  const months = listMonthsInclusive(ANALYSIS_WINDOW_START, endYm);
  let written = 0;
  for (const ym of months) {
    const asOf = monthEndDate(ym);
    if (asOf > today) continue;
    const buckets = await computeLiveBuckets({ asOfDate: asOf });
    written += await upsertSnapshots(buckets, asOf);
  }
  // Always refresh today's live snapshot too.
  const live = await computeLiveBuckets();
  written += await upsertSnapshots(live, today);
  try {
    require("./memoryCache").invalidateCache("market-index-report");
    require("./memoryCache").invalidateCache("dashboard-stats-full");
  } catch {
    /* optional */
  }
  return { ok: true, months, written, today };
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

/** Previous calendar month as YYYY-MM. */
function previousMonthKey(ym) {
  const [y, m] = String(ym).split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(ym) {
  const [y, m] = String(ym || "").split("-").map(Number);
  if (!y || !m) return ym || "";
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

/**
 * Roll daily snapshots into calendar months (last snapshot of each month wins),
 * overlay live data on the current month, then attach MoM deltas.
 * @param {string} [selectedMonth] — month to compare vs previous (YYYY-MM); defaults to current.
 */
function buildMonthlyAnalysis(historyRows, liveBuckets, currentMonth, selectedMonth = null) {
  const byMonthBucket = new Map();
  for (const r of historyRows || []) {
    const month = r.month || monthKey(r.snapshot_date);
    if (!month) continue;
    byMonthBucket.set(`${month}|${bucketKey(r)}`, {
      month,
      district: r.district,
      property_class: r.property_class,
      listing_mode: r.listing_mode,
      listing_count: Number(r.listing_count) || 0,
      with_pps: Number(r.with_pps) || 0,
      avg_price_usd: r.avg_price_usd != null ? Number(r.avg_price_usd) : null,
      avg_pps_usd: r.avg_pps_usd != null ? Number(r.avg_pps_usd) : null
    });
  }

  // Live inventory is the authoritative value for the open month.
  for (const b of liveBuckets || []) {
    byMonthBucket.set(`${currentMonth}|${bucketKey(b)}`, {
      month: currentMonth,
      ...b
    });
  }

  const monthsRaw = [...new Set([...byMonthBucket.values()].map((r) => r.month))].sort();
  if (!monthsRaw.includes(currentMonth)) monthsRaw.push(currentMonth);
  monthsRaw.sort();

  // Expert window starts April 2026; keep later months (Oct+) as they accrue.
  const monthsFromWindow = monthsRaw.filter((m) => m >= ANALYSIS_WINDOW_START);
  const months = monthsFromWindow.length ? monthsFromWindow : monthsRaw;

  const focusMonth =
    selectedMonth && monthsRaw.includes(selectedMonth)
      ? selectedMonth
      : months.includes(currentMonth)
        ? currentMonth
        : months[months.length - 1] || currentMonth;
  const prevMonth = previousMonthKey(focusMonth);
  const compareHasPrev = [...byMonthBucket.keys()].some((k) => k.startsWith(`${prevMonth}|`));

  function rowsFor(month, propertyClass, listingMode) {
    return CANONICAL_AREAS.map((district) => {
      const hit = byMonthBucket.get(`${month}|${district}|${propertyClass}|${listingMode}`);
      return (
        hit || {
          month,
          district,
          property_class: propertyClass,
          listing_mode: listingMode,
          listing_count: 0,
          with_pps: 0,
          avg_price_usd: null,
          avg_pps_usd: null
        }
      );
    });
  }

  function citywide(rows) {
    const listings = rows.reduce((s, r) => s + (r.listing_count || 0), 0);
    const weighted = rows.filter((r) => r.avg_pps_usd != null && r.with_pps > 0);
    const wSum = weighted.reduce((s, r) => s + r.with_pps, 0);
    const avgPps = wSum ? weighted.reduce((s, r) => s + r.avg_pps_usd * r.with_pps, 0) / wSum : null;
    const priced = rows.filter((r) => r.avg_price_usd != null && r.listing_count > 0);
    const avgPrice = priced.length
      ? priced.reduce((s, r) => s + r.avg_price_usd * r.listing_count, 0) / priced.reduce((s, r) => s + r.listing_count, 0)
      : null;
    return { listing_count: listings, avg_pps_usd: avgPps, avg_price_usd: avgPrice };
  }

  const datasets = {};
  for (const { propertyClass, listingMode } of PRIMARY_DATASETS) {
    const key = `${propertyClass}|${listingMode}`;
    const seriesMonths = [...new Set([...months, ...(compareHasPrev ? [prevMonth] : [])])].sort();
    const series = seriesMonths.map((month) => {
      const rows = rowsFor(month, propertyClass, listingMode);
      const cw = citywide(rows);
      return {
        month,
        label: formatMonthLabel(month),
        listing_count: cw.listing_count,
        avg_pps_usd: cw.avg_pps_usd != null ? Math.round(cw.avg_pps_usd * 100) / 100 : null,
        avg_price_usd: cw.avg_price_usd != null ? Math.round(cw.avg_price_usd) : null
      };
    });

    for (let i = 0; i < series.length; i += 1) {
      const prev = i > 0 ? series[i - 1] : null;
      series[i].mom_pps_pct = pctChange(series[i].avg_pps_usd, prev?.avg_pps_usd);
      series[i].mom_count_pct = pctChange(series[i].listing_count, prev?.listing_count);
    }

    const curRows = rowsFor(focusMonth, propertyClass, listingMode);
    const prevRows = compareHasPrev ? rowsFor(prevMonth, propertyClass, listingMode) : [];
    const prevByDistrict = new Map(prevRows.map((r) => [r.district, r]));

    const districtsAll = curRows.map((cur) => {
      const prev = prevByDistrict.get(cur.district);
      return {
        district: cur.district,
        listing_count: cur.listing_count,
        avg_pps_usd: cur.avg_pps_usd != null ? Math.round(cur.avg_pps_usd * 100) / 100 : null,
        avg_price_usd: cur.avg_price_usd != null ? Math.round(cur.avg_price_usd) : null,
        prev_listing_count: prev?.listing_count ?? null,
        prev_avg_pps_usd: prev?.avg_pps_usd != null ? Math.round(prev.avg_pps_usd * 100) / 100 : null,
        prev_avg_price_usd: prev?.avg_price_usd != null ? Math.round(prev.avg_price_usd) : null,
        mom_pps_pct: pctChange(cur.avg_pps_usd, prev?.avg_pps_usd),
        mom_count_pct: pctChange(cur.listing_count, prev?.listing_count),
        // Price trend only (expert: Trend nur Preis)
        series: months.map((month) => {
          const row = byMonthBucket.get(`${month}|${cur.district}|${propertyClass}|${listingMode}`);
          return {
            month,
            listing_count: row?.listing_count || 0,
            avg_pps_usd: row?.avg_pps_usd != null ? Math.round(row.avg_pps_usd * 100) / 100 : null
          };
        })
      };
    });

    const districts = districtsAll
      .filter((d) => d.listing_count > 0)
      .sort((a, b) => b.listing_count - a.listing_count || a.district.localeCompare(b.district))
      .slice(0, TOP_DISTRICTS);

    const curCity = series.find((s) => s.month === focusMonth) || series[series.length - 1];
    const prevCity = compareHasPrev ? series.find((s) => s.month === prevMonth) : null;

    datasets[key] = {
      propertyClass,
      listingMode,
      months,
      availableMonths: monthsRaw,
      currentMonth: focusMonth,
      previousMonth: compareHasPrev ? prevMonth : null,
      currentLabel: formatMonthLabel(focusMonth),
      previousLabel: compareHasPrev ? formatMonthLabel(prevMonth) : null,
      citywide: series.filter((s) => months.includes(s.month) || s.month === prevMonth),
      summary: {
        listing_count: curCity?.listing_count || 0,
        avg_pps_usd: curCity?.avg_pps_usd ?? null,
        prev_listing_count: prevCity?.listing_count ?? null,
        prev_avg_pps_usd: prevCity?.avg_pps_usd ?? null,
        mom_pps_pct: pctChange(curCity?.avg_pps_usd, prevCity?.avg_pps_usd),
        mom_count_pct: pctChange(curCity?.listing_count, prevCity?.listing_count)
      },
      districts
    };
  }

  return {
    currentMonth: focusMonth,
    openMonth: currentMonth,
    previousMonth: compareHasPrev ? prevMonth : null,
    months,
    availableMonths: monthsRaw,
    analysisWindow: { start: ANALYSIS_WINDOW_START, end: ANALYSIS_WINDOW_END },
    topDistricts: TOP_DISTRICTS,
    datasets
  };
}

async function loadMonthlyHistoryRows() {
  const monthExpr =
    dialect === "postgres" ? `to_char(snapshot_date, 'YYYY-MM')` : `DATE_FORMAT(snapshot_date, '%Y-%m')`;
  const [histRows] = await query(
    `SELECT ${monthExpr} AS month, district, property_class, listing_mode,
            listing_count, with_pps, avg_pps_usd, avg_price_usd, snapshot_date
     FROM market_index_snapshots
     WHERE snapshot_date >= ?
     ORDER BY snapshot_date ASC`,
    [new Date(Date.now() - 400 * 86400e3).toISOString().slice(0, 10)]
  );
  // Last daily snapshot of each calendar month wins.
  const lastByMonth = new Map();
  // First snapshot of the open month — used as MTD baseline when no prior calendar month exists yet.
  const firstByMonth = new Map();
  for (const r of histRows || []) {
    const packed = {
      month: r.month,
      district: r.district,
      property_class: r.property_class,
      listing_mode: r.listing_mode,
      listing_count: Number(r.listing_count) || 0,
      with_pps: Number(r.with_pps) || 0,
      avg_price_usd: r.avg_price_usd != null ? Number(r.avg_price_usd) : null,
      avg_pps_usd: r.avg_pps_usd != null ? Number(r.avg_pps_usd) : null,
      snapshot_date: r.snapshot_date
    };
    const key = `${r.month}|${bucketKey(r)}`;
    lastByMonth.set(key, packed);
    if (!firstByMonth.has(key)) firstByMonth.set(key, packed);
  }
  return { months: [...lastByMonth.values()], monthStarts: [...firstByMonth.values()] };
}

/**
 * Build full report: live buckets + calendar-month MoM + monthly analysis series.
 * @param {{ selectedMonth?: string|null }} [opts]
 */
async function buildMarketIndexReport({ selectedMonth = null } = {}) {
  await ensureMarketIndexSchema();
  const live = await computeLiveBuckets();
  const liveMap = new Map(live.map((b) => [bucketKey(b), b]));
  const today = todayUtcDate();
  const currentMonth = monthKey(today);

  let history = { months: [], monthStarts: [] };
  try {
    history = await loadMonthlyHistoryRows();
  } catch {
    history = { months: [], monthStarts: [] };
  }

  // Until a prior calendar month exists, use the first snapshot of this month as
  // "Month start" so the dashboard can already show price/volume movement.
  let historyForMonthly = history.months;
  let compareMode = "calendar";
  if (!history.months.some((r) => r.month !== currentMonth) && history.monthStarts.length) {
    historyForMonthly = [
      ...history.monthStarts.map((r) => ({ ...r, month: previousMonthKey(currentMonth) })),
      ...history.months
    ];
    compareMode = "month_start";
  }

  const monthly = buildMonthlyAnalysis(historyForMonthly, live, currentMonth, selectedMonth);
  monthly.compareMode = compareMode;
  if (compareMode === "month_start") {
    monthly.previousLabel = "Month start";
    for (const ds of Object.values(monthly.datasets)) {
      ds.previousLabel = "Month start";
      ds.compareMode = "month_start";
    }
  }

  // Enrich live index rows with calendar-month MoM from the monthly analysis.
  const momByKey = new Map();
  for (const ds of Object.values(monthly.datasets)) {
    for (const d of ds.districts) {
      momByKey.set(`${d.district}|${ds.propertyClass}|${ds.listingMode}`, d);
    }
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
        const mom = momByKey.get(key);
        indexes.push({
          ...liveRow,
          mom_pps_pct: mom?.mom_pps_pct ?? null,
          mom_count_pct: mom?.mom_count_pct ?? null,
          prev_listing_count: mom?.prev_listing_count ?? null,
          prev_avg_pps_usd: mom?.prev_avg_pps_usd ?? null
        });
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    currency: "USD",
    districts: CANONICAL_AREAS,
    propertyClasses: PROPERTY_CLASSES,
    primaryClasses: PRIMARY_CLASSES,
    primaryDatasets: PRIMARY_DATASETS,
    maxPpsRentUsd: MAX_PPS_RENT_USD,
    maxPpsSaleUsd: MAX_PPS_SALE_USD,
    topDistricts: TOP_DISTRICTS,
    analysisWindow: { start: ANALYSIS_WINDOW_START, end: ANALYSIS_WINDOW_END },
    openMonth: currentMonth,
    currentMonth: monthly.currentMonth,
    previousMonth: monthly.previousMonth,
    compareDate: monthly.previousMonth ? `${monthly.previousMonth}-01` : null,
    compareLabel:
      monthly.datasets["apartment|rent"]?.previousLabel ||
      (monthly.previousMonth ? formatMonthLabel(monthly.previousMonth) : null),
    compareMode,
    fxRateEtbPerUsd: getEtbPerUsd(),
    indexes,
    history: history.months,
    monthly
  };
}

/** Compact payload for the admin top-of-site ticker (top 5 by listing volume). */
function tickerFromReport(report, { propertyClass = "apartment", listingMode = "rent" } = {}) {
  const cls = PRIMARY_CLASSES.includes(propertyClass) ? propertyClass : "apartment";
  const mode = LISTING_MODES.includes(listingMode) ? listingMode : "rent";
  const unit =
    cls === "house" && mode === "sale"
      ? "USD/m² land"
      : cls === "land"
        ? "USD/m² land"
        : "USD/m² living";

  // Prefer monthly top-5 (already volume-sorted); fall back to live indexes.
  const monthlyTop = report.monthly?.datasets?.[`${cls}|${mode}`]?.districts;
  const items = (monthlyTop?.length
    ? monthlyTop
    : report.indexes
        .filter((i) => i.property_class === cls && i.listing_mode === mode && i.listing_count > 0)
        .sort((a, b) => b.listing_count - a.listing_count || a.district.localeCompare(b.district))
        .slice(0, TOP_DISTRICTS)
  ).map((i) => ({
    district: i.district,
    avgPpsUsd: i.avg_pps_usd != null ? Math.round(Number(i.avg_pps_usd) * 100) / 100 : null,
    listingCount: i.listing_count,
    momPpsPct: i.mom_pps_pct,
    momCountPct: i.mom_count_pct
  }));

  return {
    generatedAt: report.generatedAt,
    propertyClass: cls,
    listingMode: mode,
    unit,
    compareDate: report.compareDate,
    compareLabel: report.compareLabel || null,
    currentMonth: report.currentMonth || null,
    items,
    datasets: PRIMARY_DATASETS.map((d) => ({
      propertyClass: d.propertyClass,
      listingMode: d.listingMode,
      label: d.label
    }))
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
    const areaUsed =
      propertyClass === "land" || (propertyClass === "house" && mode === "sale")
        ? land || living
        : living || land;
    let pps = priceUsd && areaUsed && areaUsed > 0 ? priceUsd / areaUsed : null;
    if (pps != null) {
      const cap = mode === "rent" ? MAX_PPS_RENT_USD : MAX_PPS_SALE_USD;
      if (pps > cap) pps = null; // excluded from index; still export blank usd_per_sqm
    }
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

/** East Africa Time offset for month-close scheduling (UTC+3). */
function addisNowParts() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute)
  };
}

/**
 * Expert: analyse on the 1st of each month at 00:01 (Addis) for the previous full month.
 * Also keep a light daily/12h refresh for the open month.
 */
function startMarketIndexSnapshots() {
  let lastMonthCloseKey = "";
  const runLive = () =>
    snapshotMarketIndexes().catch((e) => console.error("Market index snapshot failed:", e.message));

  const maybeMonthClose = async () => {
    const p = addisNowParts();
    if (p.day !== 1 || p.hour !== 0 || p.minute > 15) return;
    const key = `${p.year}-${String(p.month).padStart(2, "0")}`;
    if (key === lastMonthCloseKey) return;
    lastMonthCloseKey = key;
    // Close previous calendar month using last day-of-month inventory reconstruction.
    const prev = previousMonthKey(key);
    const asOf = monthEndDate(prev);
    try {
      const buckets = await computeLiveBuckets({ asOfDate: asOf });
      await upsertSnapshots(buckets, asOf);
      await snapshotMarketIndexes();
      console.log(`Market index month-close written for ${prev} (as of ${asOf})`);
    } catch (e) {
      console.error("Market index month-close failed:", e.message);
      lastMonthCloseKey = "";
    }
  };

  setTimeout(runLive, 45 * 1000).unref();
  setInterval(runLive, 12 * 3600 * 1000).unref();
  setInterval(() => {
    maybeMonthClose().catch(() => {});
  }, 60 * 1000).unref();
}

module.exports = {
  PROPERTY_CLASSES,
  PRIMARY_CLASSES,
  PRIMARY_DATASETS,
  LISTING_MODES,
  MAX_PPS_RENT_USD,
  MAX_PPS_SALE_USD,
  TOP_DISTRICTS,
  ANALYSIS_WINDOW_START,
  ANALYSIS_WINDOW_END,
  ensureMarketIndexSchema,
  computeLiveBuckets,
  snapshotMarketIndexes,
  rebuildMarketIndexHistory,
  buildMarketIndexReport,
  buildMonthlyAnalysis,
  tickerFromReport,
  buildPropertiesExportCsv,
  startMarketIndexSnapshots,
  propertyClassSql,
  areaM2Sql,
  classifyPropertyJs,
  pctChange,
  previousMonthKey,
  formatMonthLabel,
  listMonthsInclusive,
  monthEndDate
};
