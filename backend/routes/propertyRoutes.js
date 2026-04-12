const express = require("express");
const {
  getProperties,
  getPropertyById,
  getFeatured
} = require("../controllers/propertyController");

const router = express.Router();

router.get("/", getProperties);
router.get("/featured", getFeatured);
router.get("/:property_id", getPropertyById);

module.exports = router;
