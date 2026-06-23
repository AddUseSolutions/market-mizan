const path = require("path");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const propertyRoutes = require("./routes/propertyRoutes");
const contactRoutes = require("./routes/contactRoutes");
const metaRoutes = require("./routes/metaRoutes");
const authRoutes = require("./routes/authRoutes");
const listingRoutes = require("./routes/listingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const roleRoutes = require("./routes/roles");
const communityRoutes = require("./routes/communityRoutes");
const errorHandler = require("./middleware/errorHandler");
const {
  ensurePropertiesSchema,
  ensureUsersSchema,
  ensureListingSubmissionsSchema,
  ensureInquiriesSchema,
  ensureFeedbackSchema,
  ensureHolisticLeadsSchema,
  ensureSourcesSeed
} = require("./db/ensureSchema");
const { ensureRbacSchema } = require("./db/ensureRbacSchema");

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET must be set in production.");
  process.exit(1);
}

const app = express();
const PORT = Number(process.env.PORT || 3001);
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL ? frontendOrigin : true,
    credentials: false
  })
);
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"), { maxAge: "7d" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api", limiter);

const healthJson = { status: "ok" };
app.get("/health", (req, res) => res.json(healthJson));
app.get("/", (req, res) => res.json(healthJson));
app.use("/api/properties", propertyRoutes);
app.use("/api", contactRoutes);
app.use("/api", metaRoutes);
app.use("/api", authRoutes);
app.use("/api", listingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/community", communityRoutes);
app.use(errorHandler);

(async () => {
  try {
    await ensurePropertiesSchema();
    await ensureUsersSchema();
    await ensureRbacSchema();
    await ensureListingSubmissionsSchema();
    await ensureInquiriesSchema();
    await ensureFeedbackSchema();
    await ensureHolisticLeadsSchema();
    await ensureSourcesSeed();
  } catch (e) {
    console.error("DB-Schema:", e.message);
  }
  app.listen(PORT, () => {
    console.log(`Market Mizan API läuft auf Port ${PORT}`);
  });
})();
