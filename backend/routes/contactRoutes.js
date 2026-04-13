const express = require("express");
const rateLimit = require("express-rate-limit");
const { postContact } = require("../controllers/contactController");

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." }
});

router.post("/contact", contactLimiter, postContact);

module.exports = router;
