const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  getProperties,
  getPropertyById,
  getFeatured,
  submitListing,
  getPriceHistory
} = require("../controllers/propertyController");
const { uploadListingImages, MAX_PHOTOS } = require("../middleware/upload");
const { optionalAuth, requireAuth } = require("../middleware/auth");
const { submitListingRevision, listOwnedListings } = require("../utils/submissionEdit");
const { formatListingRef } = require("../utils/listingRef");
const { antiScrapeListings } = require("../middleware/antiScrape");

const router = express.Router();

router.use(optionalAuth);

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

/** Stricter than the global /api limiter — listing dumps are the scrape target. */
const listLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.SCRAPE_LIST_RATE_MAX || 45),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many listing requests. Slow down." }
});

router.get("/", listLimiter, antiScrapeListings, getProperties);
router.get("/featured", listLimiter, antiScrapeListings, getFeatured);
router.post(
  "/submit-listing",
  submitLimiter,
  uploadListingImages.array("images", MAX_PHOTOS),
  submitListing
);
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const rows = await listOwnedListings(req.user);
    res.json({
      listings: rows.map((row) => ({
        ...row,
        listing_ref: formatListingRef(row.id),
        pending_review: Boolean(row.pending_submission_id)
      }))
    });
  } catch (e) {
    next(e);
  }
});
router.post("/:property_id/revision", requireAuth, async (req, res, next) => {
  try {
    const result = await submitListingRevision(req.user, req.params.property_id, req.body || {});
    res.json({
      ok: true,
      pending: true,
      submissionId: result.submissionId,
      message: "Changes submitted. The live listing stays as it is until we approve the update."
    });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});
const detailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.SCRAPE_DETAIL_RATE_MAX || 90),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many detail requests. Slow down." }
});

router.get("/:property_id/price-history", detailLimiter, antiScrapeListings, getPriceHistory);
router.get("/:property_id", detailLimiter, antiScrapeListings, getPropertyById);

module.exports = router;
