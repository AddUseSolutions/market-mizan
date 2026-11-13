const express = require("express");
const rateLimit = require("express-rate-limit");
const { getFilterOptions, getPriceHistogram, getPublicSitemap, getFxRate } = require("../controllers/metaController");
const { getNeighborhoodStats } = require("../controllers/adminController");
const { getMapListings } = require("../controllers/mapListingsController");
const { getPublicMarketTicker } = require("../controllers/marketIndexController");
const { antiScrapeListings } = require("../middleware/antiScrape");

const router = express.Router();

const mapDumpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.SCRAPE_MAP_RATE_MAX || 12),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many map requests. Slow down." }
});

router.get("/filters/options", getFilterOptions);
router.get("/filters/price-histogram", getPriceHistogram);
router.get("/neighborhoods", getNeighborhoodStats);
router.get("/map-listings", mapDumpLimiter, antiScrapeListings, getMapListings);
router.get("/market-ticker", getPublicMarketTicker);
router.get("/fx", getFxRate);
router.get("/sitemap.xml", getPublicSitemap);

module.exports = router;
