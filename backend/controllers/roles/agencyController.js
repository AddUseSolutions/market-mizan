const { query, dialect } = require("../../db/connection");

function toNum(v) {
  return v == null ? null : Number(v);
}

function canEditThirdPartyListings(email) {
  return String(email || "").trim().toLowerCase() === "property@epmglobal.com";
}

async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const [profileRows] = await query(
      "SELECT agency_name, short_name, license_number, bulk_upload_enabled, auto_verify_listings FROM agency_profiles WHERE user_id = ? LIMIT 1",
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
    const [avgByNeighborhood] = await query(
      `SELECT
         TRIM(COALESCE(canonical_area, location_area, 'Other')) AS neighborhood,
         CASE WHEN LOWER(COALESCE(property_status, '')) LIKE '%rent%' THEN 'rent' ELSE 'sale' END AS listing_mode,
         ROUND(AVG(COALESCE(price_etb, price)), 0) AS avg_price_etb,
         ROUND(AVG(COALESCE(price_usd, price)), 0) AS avg_price_usd,
         COUNT(*) AS listing_count
       FROM properties
       WHERE owner_id = ? AND is_active = TRUE
       GROUP BY 1, 2
       ORDER BY listing_count DESC, neighborhood ASC`,
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
      avgPriceByNeighborhood: avgByNeighborhood.map((row) => ({
        neighborhood: row.neighborhood,
        listing_mode: row.listing_mode,
        avg_price_etb: toNum(row.avg_price_etb),
        avg_price_usd: toNum(row.avg_price_usd),
        listing_count: Number(row.listing_count || 0)
      })),
      recentListings,
      features: ["broker_dashboard", "bulk_upload", "lead_management", "auto_verify"]
    });
  } catch (error) {
    next(error);
  }
}

async function listEditableListings(req, res, next) {
  try {
    const userId = req.user.id;
    const email = req.user.email;
    const thirdParty = canEditThirdPartyListings(email);
    const [rows] = await query(
      `SELECT property_id, title, location_area, location_city, property_status, price_etb, price_usd, source_website, source_name
       FROM properties
       WHERE is_active = TRUE
         AND (owner_id = ? OR (? = TRUE AND source_website = 'just.property'))
       ORDER BY last_seen DESC
       LIMIT 80`,
      [userId, thirdParty]
    );
    res.json({ listings: rows, thirdPartyEnabled: thirdParty });
  } catch (error) {
    next(error);
  }
}

async function updateListing(req, res, next) {
  try {
    const userId = req.user.id;
    const email = req.user.email;
    const propertyId = String(req.params.property_id || "").trim();
    if (!propertyId) return res.status(400).json({ message: "property_id is required." });

    const [rows] = await query(
      `SELECT p.property_id, p.owner_id, p.source_website, ap.agency_name, ap.short_name
       FROM properties p
       LEFT JOIN agency_profiles ap ON ap.user_id = ?
       WHERE p.property_id = ? AND p.is_active = TRUE
       LIMIT 1`,
      [userId, propertyId]
    );
    if (!rows.length) return res.status(404).json({ message: "Listing not found." });
    const row = rows[0];
    const canEditOwn = Number(row.owner_id) === Number(userId);
    const canEditJustProperty = canEditThirdPartyListings(email) && row.source_website === "just.property";
    if (!canEditOwn && !canEditJustProperty) {
      return res.status(403).json({ message: "You can edit only your own listings." });
    }

    const title = String(req.body?.title || "").trim().slice(0, 255) || null;
    const locationArea = String(req.body?.location_area || "").trim().slice(0, 255) || null;
    const locationCity = String(req.body?.location_city || "").trim().slice(0, 100) || null;
    const status = String(req.body?.property_status || "").trim().slice(0, 80) || null;
    const priceEtb = req.body?.price_etb != null && req.body?.price_etb !== "" ? Number(req.body.price_etb) : null;
    const priceUsd = req.body?.price_usd != null && req.body?.price_usd !== "" ? Number(req.body.price_usd) : null;
    const sourceName = String(row.short_name || row.agency_name || "").trim().slice(0, 255) || null;

    if (priceEtb != null && (!Number.isFinite(priceEtb) || priceEtb <= 0)) {
      return res.status(400).json({ message: "price_etb must be a positive number." });
    }
    if (priceUsd != null && (!Number.isFinite(priceUsd) || priceUsd <= 0)) {
      return res.status(400).json({ message: "price_usd must be a positive number." });
    }

    await query(
      `UPDATE properties
       SET title = COALESCE(?, title),
           location_area = COALESCE(?, location_area),
           location_city = COALESCE(?, location_city),
           property_status = COALESCE(?, property_status),
           price_etb = COALESCE(?, price_etb),
           price_usd = COALESCE(?, price_usd),
           price = COALESCE(?, price),
           owner_id = ?,
           source_name = COALESCE(?, source_name),
           last_seen = NOW()
       WHERE property_id = ?`,
      [
        title,
        locationArea,
        locationCity,
        status,
        priceEtb,
        priceUsd,
        priceEtb,
        userId,
        sourceName,
        propertyId
      ]
    );

    res.json({ ok: true, property_id: propertyId });
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

module.exports = { getDashboard, listLeads, listEditableListings, updateListing };
