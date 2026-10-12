const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { normalizeBatch, recordBatch } = require("../utils/analyticsStore");
const { RANGES, buildAnalyticsReport, buildLiveSnapshot } = require("../utils/analyticsReport");
const { getCached } = require("../utils/memoryCache");

const OWN_HOSTS = ["mmizan.com", "localhost"];
try {
  if (process.env.FRONTEND_URL) OWN_HOSTS.push(new URL(process.env.FRONTEND_URL).hostname.replace(/^www\./, ""));
} catch {
  /* ignore malformed FRONTEND_URL */
}

// Generous: Ethiopian mobile carriers put many visitors behind one shared (CGNAT) IP.
const collectLimiter = rateLimit({ windowMs: 60 * 1000, max: 600, standardHeaders: false, legacyHeaders: false });
const reportLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });

/** Public beacon endpoint: navigator.sendBeacon posts text/plain JSON. */
const collectRouter = express.Router();
collectRouter.post("/", collectLimiter, express.text({ type: "*/*", limit: "64kb" }), (req, res) => {
  res.status(204).end();
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return;
    }
  }
  const batch = normalizeBatch(body, req.get("user-agent"), { ownHosts: OWN_HOSTS });
  if (!batch) return;
  recordBatch(batch).catch((e) => console.error("Analytics collect failed:", e.message));
});

/** Admin-only reports; separate limiter so live polling doesn't eat the admin quota. */
const reportRouter = express.Router();
reportRouter.use(reportLimiter, requireAuth, requireAdmin);

reportRouter.get("/", async (req, res, next) => {
  try {
    const range = RANGES[req.query.range] ? req.query.range : "7d";
    const report = await getCached(`analytics-report-${range}`, 60 * 1000, () => buildAnalyticsReport(range));
    res.json(report);
  } catch (e) {
    next(e);
  }
});

reportRouter.get("/live", async (req, res, next) => {
  try {
    res.json(await buildLiveSnapshot());
  } catch (e) {
    next(e);
  }
});

module.exports = { collectRouter, reportRouter };
