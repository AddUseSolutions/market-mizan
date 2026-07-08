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
const { ensureInviteSchema } = require("./utils/userInvites");

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET must be set in production.");
  process.exit(1);
}

const app = express();
const PORT = Number(process.env.PORT || 3001);
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = [frontendOrigin, "https://mmizan.com", "https://www.mmizan.com"];

app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL ? allowedOrigins : true,
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
    await ensureInviteSchema();
    await ensureListingSubmissionsSchema();
    await ensureInquiriesSchema();
    await ensureFeedbackSchema();
    await ensureHolisticLeadsSchema();
    await ensureSourcesSeed();
    const { backfillCanonicalAreas } = require("./db/backfillCanonicalAreas");
    backfillCanonicalAreas().catch((e) => console.error("Canonical area backfill failed:", e.message));
    if (/^(1|true|yes)$/i.test(process.env.JUSTPROPERTY_REPAIR_PRICES_ON_START || "")) {
      const { query } = require("./db/connection");
      const { repairJustPropertyPricingAsync, needsJustPropertyApiRepair } = require("./utils/fxRate");
      query(`SELECT * FROM properties WHERE source_website = 'just.property' AND is_active = TRUE`)
        .then(async ([rows]) => {
          let updated = 0;
          for (const row of rows) {
            if (!needsJustPropertyApiRepair(row)) continue;
            const fixed = await repairJustPropertyPricingAsync(row);
            if (!fixed.price_usd || !fixed.price_etb) continue;
            await query(
              `UPDATE properties SET price = ?, price_etb = ?, price_usd = ?,
               fx_rate_zar_usd = ?, fx_rate_etb_usd = ?, fx_rate_date = ?, currency = 'ETB'
               WHERE id = ?`,
              [
                fixed.price_etb,
                fixed.price_etb,
                fixed.price_usd,
                fixed.fx_rate_zar_usd,
                fixed.fx_rate_etb_usd,
                fixed.fx_rate_date,
                row.id
              ]
            );
            updated += 1;
          }
          if (updated) console.log(`Just Property price repair: ${updated} rows updated.`);
        })
        .catch((e) => console.error("Just Property price repair failed:", e.message));
    }
  } catch (e) {
    console.error("DB-Schema:", e.message);
  }
  app.listen(PORT, () => {
    console.log(`Market Mizan API läuft auf Port ${PORT}`);
  });
})();
