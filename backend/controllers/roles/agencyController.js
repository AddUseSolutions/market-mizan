const { query } = require("../../db/connection");

async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const [profileRows] = await query(
      "SELECT agency_name, license_number, bulk_upload_enabled FROM agency_profiles WHERE user_id = ? LIMIT 1",
      [userId]
    );
    const [listingCount] = await query(
      "SELECT COUNT(*) AS c FROM properties WHERE owner_id = ? AND is_active = TRUE",
      [userId]
    );
    res.json({
      role: "AGENCY_BROKER",
      profile: profileRows[0] || null,
      stats: {
        activeListings: Number(listingCount[0]?.c || 0),
        bulkUploadEnabled: profileRows[0]?.bulk_upload_enabled !== false
      },
      features: ["broker_dashboard", "bulk_upload", "lead_management"]
    });
  } catch (error) {
    next(error);
  }
}

async function listLeads(req, res) {
  res.json({
    leads: [],
    message: "Lead-Verwaltung: Anbindung an Kontaktanfragen folgt in Phase 2."
  });
}

module.exports = { getDashboard, listLeads };
