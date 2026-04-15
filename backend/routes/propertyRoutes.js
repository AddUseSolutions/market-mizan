const express = require("express");
const {
  getProperties,
  getPropertyById,
  getFeatured,
  submitListing
} = require("../controllers/propertyController");

const router = express.Router();

router.get("/", getProperties);
router.get("/featured", getFeatured);
router.post("/submit-listing", submitListing);
router.get("/:property_id", getPropertyById);

module.exports = router;
