const express = require("express");
const rateLimit = require("express-rate-limit");
const { suggestTitle, suggestDescriptionHandler, requestRemoval } = require("../controllers/listingController");

const router = express.Router();

const listingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/listings/suggest-title", listingLimiter, suggestTitle);
router.post("/listings/suggest-description", listingLimiter, suggestDescriptionHandler);
router.post("/listings/request-removal", listingLimiter, requestRemoval);

module.exports = router;
