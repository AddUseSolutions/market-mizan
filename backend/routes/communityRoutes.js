const express = require("express");
const rateLimit = require("express-rate-limit");
const { optionalAuth } = require("../middleware/auth");
const { postReview, getReviews, confirmListing, getRecommendations } = require("../controllers/communityController");

const router = express.Router();

const communityLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

router.use(optionalAuth);
router.get("/recommendations", getRecommendations);
router.get("/reviews/:property_id", getReviews);
router.post("/reviews", communityLimiter, optionalAuth, postReview);
router.post("/confirm-listing", communityLimiter, optionalAuth, confirmListing);

module.exports = router;
