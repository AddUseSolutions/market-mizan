const express = require("express");
const { getFilterOptions } = require("../controllers/metaController");
const { getNeighborhoodStats } = require("../controllers/adminController");

const router = express.Router();

router.get("/filters/options", getFilterOptions);
router.get("/neighborhoods", getNeighborhoodStats);

module.exports = router;
