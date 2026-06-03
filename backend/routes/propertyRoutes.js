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

const router = express.Router();

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
router.get("/:property_id/price-history", getPriceHistory);
router.get("/:property_id", getPropertyById);

module.exports = router;
