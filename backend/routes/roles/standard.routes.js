const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth, checkRole } = require("../../middleware/auth");
const { ROLES } = require("../../constants/roles");
const standardController = require("../../controllers/roles/standardController");

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

router.use(limiter);
router.use(requireAuth, checkRole(
  ROLES.ADMIN,
  ROLES.STANDARD_USER,
  ROLES.PREMIUM_BUYER,
  ROLES.PRIVATE_LANDLORD,
  ROLES.AGENCY_BROKER
));

router.get("/dashboard", standardController.getDashboard);
router.get("/favorites", standardController.listFavorites);
router.post("/favorites/:propertyId", standardController.addFavorite);
router.delete("/favorites/:propertyId", standardController.removeFavorite);
router.post("/flags", standardController.flagListing);

module.exports = router;
