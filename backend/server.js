require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const propertyRoutes = require("./routes/propertyRoutes");
const contactRoutes = require("./routes/contactRoutes");
const metaRoutes = require("./routes/metaRoutes");
const authRoutes = require("./routes/authRoutes");
const errorHandler = require("./middleware/errorHandler");
const { ensurePropertiesSchema, ensureUsersSchema } = require("./db/ensureSchema");

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "2mb" }));

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
app.use(errorHandler);

(async () => {
  try {
    await ensurePropertiesSchema();
    await ensureUsersSchema();
  } catch (e) {
    console.error("DB-Schema:", e.message);
  }
  app.listen(PORT, () => {
    console.log(`Market Mizan API läuft auf Port ${PORT}`);
  });
})();
