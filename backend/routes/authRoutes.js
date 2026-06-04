const express = require("express");
const rateLimit = require("express-rate-limit");
const { register, login, me, listRoles } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/auth/register", authLimiter, register);
router.post("/auth/login", authLimiter, login);
router.get("/auth/me", requireAuth, me);
router.get("/auth/roles", listRoles);

module.exports = router;
