const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth, requireAdmin, checkRole } = require("../middleware/auth");
const { getDashboardStats } = require("../controllers/dashboardController");
const { ROLES } = require("../constants/roles");
const {
  getSubmissions,
  getSubmissionById,
  publishSubmission,
  rejectSubmission,
  verifyProperty,
  deactivateProperty,
  getNeighborhoodStats,
  runMaintenance,
  resetCrawledForRescrape
} = require("../controllers/adminController");
const { runScraperNow, getStats, getScrapeLogs, getSources } = require("../controllers/metaController");
const { listUsers, createUserInvite, resendUserInvite } = require("../controllers/userAdminController");

const router = express.Router();
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

router.use(adminLimiter);

router.get(
  "/dashboard-stats",
  requireAuth,
  checkRole(ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER),
  getDashboardStats
);

router.use(requireAuth, requireAdmin);

router.get("/submissions", getSubmissions);
router.get("/submissions/:id", getSubmissionById);
router.post("/submissions/:id/publish", publishSubmission);
router.post("/submissions/:id/reject", rejectSubmission);
router.post("/properties/:property_id/verify", verifyProperty);
router.post("/properties/:property_id/deactivate", deactivateProperty);
router.get("/neighborhoods", getNeighborhoodStats);
router.post("/maintenance", runMaintenance);
router.post("/reset-crawled-for-rescrape", resetCrawledForRescrape);
router.get("/stats", getStats);
router.get("/scrape-logs", getScrapeLogs);
router.get("/sources", getSources);
router.post("/run-scraper", runScraperNow);

router.get("/users", listUsers);
router.post("/users/invite", createUserInvite);
router.post("/users/:id/resend-invite", resendUserInvite);

module.exports = router;
