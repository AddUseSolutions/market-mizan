const express = require("express");
const adminRoutes = require("./admin.routes");
const agencyRoutes = require("./agency.routes");
const landlordRoutes = require("./landlord.routes");
const premiumRoutes = require("./premium.routes");
const standardRoutes = require("./standard.routes");

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/agency", agencyRoutes);
router.use("/landlord", landlordRoutes);
router.use("/premium", premiumRoutes);
router.use("/standard", standardRoutes);

module.exports = router;
