const express = require("express");
const { getFilterOptions, getPriceHistogram, getPublicSitemap, getFxRate } = require("../controllers/metaController");
const { getNeighborhoodStats } = require("../controllers/adminController");
const { getMapListings } = require("../controllers/mapListingsController");
const { getPublicMarketTicker } = require("../controllers/marketIndexController");

const router = express.Router();

router.get("/filters/options", getFilterOptions);
router.get("/filters/price-histogram", getPriceHistogram);
router.get("/neighborhoods", getNeighborhoodStats);
router.get("/map-listings", getMapListings);
router.get("/market-ticker", getPublicMarketTicker);
router.get("/fx", getFxRate);
router.get("/sitemap.xml", getPublicSitemap);

module.exports = router;
