const { query, dialect } = require("../../db/connection");

async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const [profileRows] = await query(
      "SELECT agency_name, license_number, bulk_upload_enabled, auto_verify_listings FROM agency_profiles WHERE user_id = ? LIMIT 1",
      [userId]
    );
    const profile = profileRows[0] || null;

    const [[listingCount]] = await query(
      "SELECT COUNT(*) AS c FROM properties WHERE owner_id = ? AND is_active = TRUE",
      [userId]
    );
    const [[verifiedCount]] = await query(
      "SELECT COUNT(*) AS c FROM properties WHERE owner_id = ? AND is_active = TRUE AND verification_status = 'verified'",
      [userId]
    );
    const [[pendingCount]] = await query(
      `SELECT COUNT(*) AS c FROM listing_submissions
       WHERE contact_email = (SELECT email FROM users WHERE id = ? LIMIT 1)
         AND status = 'pending'`,
      [userId]
    );
    const portfolioSql =
      dialect === "postgres"
        ? `SELECT
             ROUND(AVG(COALESCE(price_usd, price))::numeric, 0) AS avg_price_usd,
             ROUND(SUM(COALESCE(price_usd, price))::numeric, 0) AS portfolio_value_usd,
             ROUND(AVG(property_size_m2)::numeric, 0) AS avg_size_m2
           FROM properties WHERE owner_id = ? AND is_active = TRUE`
        : `SELECT
             ROUND(AVG(COALESCE(price_usd, price)), 0) AS avg_price_usd,
             ROUND(SUM(COALESCE(price_usd, price)), 0) AS portfolio_value_usd,
             ROUND(AVG(property_size_m2), 0) AS avg_size_m2
           FROM properties WHERE owner_id = ? AND is_active = TRUE`;
    const [portfolio] = await query(portfolioSql, [userId]);
    const [areaBreakdown] = await query(
      `SELECT TRIM(COALESCE(canonical_area, location_area, 'Other')) AS area, COUNT(*) AS count
       FROM properties WHERE owner_id = ? AND is_active = TRUE
       GROUP BY 1 ORDER BY count DESC LIMIT 6`,
      [userId]
    );
    const [recentListings] = await query(
      `SELECT property_id, title, price_usd, price_etb, location_area, verification_status, first_seen
       FROM properties WHERE owner_id = ? AND is_active = TRUE
       ORDER BY first_seen DESC LIMIT 8`,
      [userId]
    );

    res.json({
      role: "AGENCY_BROKER",
      profile,
      stats: {
        activeListings: Number(listingCount?.c || 0),
        verifiedListings: Number(verifiedCount?.c || 0),
        pendingSubmissions: Number(pendingCount?.c || 0),
        bulkUploadEnabled: profile?.bulk_upload_enabled !== false,
        autoVerifyEnabled: Boolean(profile?.auto_verify_listings),
        avgPriceUsd: portfolio[0]?.avg_price_usd != null ? Number(portfolio[0].avg_price_usd) : null,
        portfolioValueUsd: portfolio[0]?.portfolio_value_usd != null ? Number(portfolio[0].portfolio_value_usd) : null,
        avgSizeM2: portfolio[0]?.avg_size_m2 != null ? Number(portfolio[0].avg_size_m2) : null
      },
      areaBreakdown: areaBreakdown.map((row) => ({
        area: row.area,
        count: Number(row.count)
      })),
      recentListings,
      features: ["broker_dashboard", "bulk_upload", "lead_management", "auto_verify"]
    });
  } catch (error) {
    next(error);
  }
}

async function listLeads(req, res) {
  res.json({
    leads: [],
    message: "Lead management connects to contact inquiries in a future release."
  });
}

module.exports = { getDashboard, listLeads };
