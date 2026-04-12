const express = require("express");
const {
  getFilterOptions,
  getSources,
  getStats,
  getScrapeLogs,
  runScraperNow
} = require("../controllers/metaController");

const router = express.Router();

router.get("/filters/options", getFilterOptions);
router.get("/sources", getSources);
router.get("/stats", getStats);
router.get("/scrape-logs", getScrapeLogs);
router.post("/admin/run-scraper", runScraperNow);

module.exports = router;
