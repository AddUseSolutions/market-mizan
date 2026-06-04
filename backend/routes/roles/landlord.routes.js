const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth, checkRole } = require("../../middleware/auth");
const { ROLES } = require("../../constants/roles");
const landlordController = require("../../controllers/roles/landlordController");

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

router.use(limiter);
router.use(requireAuth, checkRole(ROLES.ADMIN, ROLES.PRIVATE_LANDLORD, ROLES.AGENCY_BROKER));

router.get("/dashboard", landlordController.getDashboard);
router.patch("/profile", landlordController.updateProfile);

module.exports = router;
