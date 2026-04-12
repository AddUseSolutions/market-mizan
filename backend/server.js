require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const propertyRoutes = require("./routes/propertyRoutes");
const metaRoutes = require("./routes/metaRoutes");
const errorHandler = require("./middleware/errorHandler");
const { ensurePropertiesSchema } = require("./db/ensureSchema");

const app = express();
const PORT = Number(process.env.PORT || 3001);

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

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/properties", propertyRoutes);
app.use("/api", metaRoutes);
app.use(errorHandler);

(async () => {
  try {
    await ensurePropertiesSchema();
  } catch (e) {
    console.error("DB-Schema:", e.message);
  }
  app.listen(PORT, () => {
    console.log(`Market Mizan API läuft auf Port ${PORT}`);
  });
})();
