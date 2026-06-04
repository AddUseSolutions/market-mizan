const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth, checkRole } = require("../../middleware/auth");
const { ROLES } = require("../../constants/roles");
const premiumController = require("../../controllers/roles/premiumController");

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

router.use(limiter);
router.use(requireAuth, checkRole(ROLES.ADMIN, ROLES.PREMIUM_BUYER));

router.get("/dashboard", premiumController.getDashboard);
router.get("/analytics/neighborhoods", premiumController.getMarketAnalytics);

module.exports = router;
