const express = require("express");
const rateLimit = require("express-rate-limit");
const { register, login, googleLogin } = require("../controllers/authController");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/auth/register", authLimiter, register);
router.post("/auth/login", authLimiter, login);
router.post("/auth/google", authLimiter, googleLogin);

module.exports = router;
