const { getCached } = require("../utils/memoryCache");
const {
  buildMarketIndexReport,
  tickerFromReport,
  buildPropertiesExportCsv,
  snapshotMarketIndexes
} = require("../utils/marketIndex");

const REPORT_TTL_MS = 10 * 60 * 1000;

async function getMarketIndices(req, res, next) {
  try {
    const propertyClass = String(req.query.class || "apartment");
    const listingMode = String(req.query.mode || "rent");
    const report = await getCached("market-index-report", REPORT_TTL_MS, () => buildMarketIndexReport());
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
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
}

module.exports = { getMarketIndices, exportProperties, refreshMarketIndex };
