const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const {
  getSubmissions,
  publishSubmission,
  rejectSubmission,
  verifyProperty,
  deactivateProperty,
  getNeighborhoodStats,
  runMaintenance,
  resetCrawledForRescrape
} = require("../controllers/adminController");
const { runScraperNow, getStats, getScrapeLogs, getSources } = require("../controllers/metaController");

const router = express.Router();
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

router.use(adminLimiter);
router.use(requireAuth, requireAdmin);

router.get("/submissions", getSubmissions);
router.post("/submissions/:id/publish", publishSubmission);
router.post("/submissions/:id/reject", rejectSubmission);
router.post("/properties/:property_id/verify", verifyProperty);
router.post("/properties/:property_id/deactivate", deactivateProperty);
router.get("/neighborhoods", getNeighborhoodStats);
router.post("/maintenance", runMaintenance);
router.post("/reset-crawled-for-rescrape", resetCrawledForRescrape);
router.get("/stats", getStats);
router.get("/scrape-logs", getScrapeLogs);
router.get("/sources", getSources);
router.post("/run-scraper", runScraperNow);

module.exports = router;
