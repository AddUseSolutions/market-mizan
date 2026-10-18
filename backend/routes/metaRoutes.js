const express = require("express");
const { getFilterOptions, getPriceHistogram, getPublicSitemap } = require("../controllers/metaController");
const { getNeighborhoodStats } = require("../controllers/adminController");

const router = express.Router();

router.get("/filters/options", getFilterOptions);
router.get("/filters/price-histogram", getPriceHistogram);
router.get("/neighborhoods", getNeighborhoodStats);
router.get("/sitemap.xml", getPublicSitemap);

module.exports = router;
