const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  getProperties,
  getPropertyById,
  getFeatured,
  submitListing,
  getPriceHistory
} = require("../controllers/propertyController");
const { uploadListingImages } = require("../middleware/upload");
const { optionalAuth, requireAuth } = require("../middleware/auth");
const { submitListingRevision, listOwnedListings } = require("../utils/submissionEdit");
const { formatListingRef } = require("../utils/listingRef");

const router = express.Router();

router.use(optionalAuth);

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

router.get("/", getProperties);
router.get("/featured", getFeatured);
router.post(
  "/submit-listing",
  submitLimiter,
  uploadListingImages.array("images", 6),
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
router.get("/:property_id/price-history", getPriceHistory);
router.get("/:property_id", getPropertyById);

module.exports = router;
