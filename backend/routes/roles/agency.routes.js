const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth, checkRole } = require("../../middleware/auth");
const { ROLES } = require("../../constants/roles");
const agencyController = require("../../controllers/roles/agencyController");

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

router.use(limiter);
router.use(requireAuth, checkRole(ROLES.ADMIN, ROLES.AGENCY_BROKER));

router.get("/dashboard", agencyController.getDashboard);
router.get("/leads", agencyController.listLeads);
router.get("/listings/editable", agencyController.listEditableListings);
router.patch("/listings/:property_id", agencyController.updateListing);

module.exports = router;
