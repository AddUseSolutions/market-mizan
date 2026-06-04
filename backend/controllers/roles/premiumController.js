const { getNeighborhoodStats } = require("../adminController");
const { query } = require("../../db/connection");

async function getDashboard(req, res, next) {
  try {
    const [subRows] = await query(
      "SELECT tier, expires_at, is_active FROM premium_subscriptions WHERE user_id = ? LIMIT 1",
      [req.user.id]
    );
    res.json({
      role: "PREMIUM_BUYER",
      subscription: subRows[0] || null,
      features: ["woreda_price_analytics", "historical_trends", "hmlo_benchmarks"]
    });
  } catch (error) {
    next(error);
  }
}

/** Re-use admin neighborhood stats for premium analytics (protected). */
async function getMarketAnalytics(req, res, next) {
  return getNeighborhoodStats(req, res, next);
}

module.exports = { getDashboard, getMarketAnalytics };
