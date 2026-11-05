const { getCached, invalidateCache } = require("../utils/memoryCache");
const {
  buildMarketIndexReport,
  tickerFromReport,
  buildPropertiesExportCsv,
  snapshotMarketIndexes,
  rebuildMarketIndexHistory,
  computeLiveRentTickerByFurnishing,
  computeLiveSaleTicker,
  priorApartmentPpsMap,
  withSnapshotMom
} = require("../utils/marketIndex");

const REPORT_TTL_MS = 10 * 60 * 1000;
const PUBLIC_TICKER_CACHE_KEY = "public-market-ticker";

async function getMarketIndices(req, res, next) {
  try {
    const propertyClass = String(req.query.class || "apartment");
    const listingMode = String(req.query.mode || "rent");
    const selectedMonth = req.query.month ? String(req.query.month).slice(0, 7) : null;
    const cacheKey = selectedMonth ? `market-index-report:${selectedMonth}` : "market-index-report";
    const report = await getCached(cacheKey, REPORT_TTL_MS, () => buildMarketIndexReport({ selectedMonth }));
    if (req.query.full === "1") {
      return res.json(report);
    }
    return res.json(tickerFromReport(report, { propertyClass, listingMode }));
  } catch (e) {
    next(e);
  }
}

async function exportProperties(req, res, next) {
  try {
    const csv = await buildPropertiesExportCsv();
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="market-mizan-properties-${stamp}.csv"`);
    res.send(csv);
  } catch (e) {
    next(e);
  }
}

async function refreshMarketIndex(req, res, next) {
  try {
    const result = await snapshotMarketIndexes();
    try {
      invalidateCache("market-index-report");
      invalidateCache(PUBLIC_TICKER_CACHE_KEY);
      invalidateCache("dashboard-stats-full");
    } catch {
      /* optional */
    }
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
}

/** Wipe snapshots and rebuild Apr–Sep (+ today) with current PPS / area rules. */
async function rebuildMarketIndex(req, res, next) {
  try {
    const result = await rebuildMarketIndexHistory();
    try {
      invalidateCache(); // clear all report month variants
    } catch {
      /* optional */
    }
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function getPublicMarketTicker(req, res, next) {
  try {
    // Live district queries only — never wait on the full market-index report.
    const payload = await getCached(PUBLIC_TICKER_CACHE_KEY, REPORT_TTL_MS, async () => {
      const [rent, rentFurnished, sale, prior] = await Promise.all([
        computeLiveRentTickerByFurnishing({ furnished: false }),
        computeLiveRentTickerByFurnishing({ furnished: true }),
        computeLiveSaleTicker(),
        priorApartmentPpsMap().catch(() => new Map())
      ]);
      return {
        unit: "USD/m² living",
        rent: withSnapshotMom(rent, "rent", prior),
        rentFurnished: withSnapshotMom(rentFurnished, "rent", prior),
        sale: withSnapshotMom(sale, "sale", prior)
      };
    });
    res.json(payload);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getMarketIndices,
  getPublicMarketTicker,
  exportProperties,
  refreshMarketIndex,
  rebuildMarketIndex
};
