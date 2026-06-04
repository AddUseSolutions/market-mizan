const { query, dialect } = require("../../db/connection");

async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const [favCount] = await query(
      "SELECT COUNT(*) AS c FROM user_favorites WHERE user_id = ?",
      [userId]
    );
    const [flagCount] = await query(
      "SELECT COUNT(*) AS c FROM listing_crowd_flags WHERE user_id = ?",
      [userId]
    );
    res.json({
      role: "STANDARD_USER",
      stats: {
        watchlistCount: Number(favCount[0]?.c || 0),
        flagsSubmitted: Number(flagCount[0]?.c || 0)
      },
      features: ["watchlist", "contact_broker", "flag_listing_status"]
    });
  } catch (error) {
    next(error);
  }
}

async function listFavorites(req, res, next) {
  try {
    const [rows] = await query(
      `SELECT f.property_id, f.created_at, p.title, p.price_usd, p.location_area
       FROM user_favorites f
       LEFT JOIN properties p ON p.property_id = f.property_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json({ favorites: rows });
  } catch (error) {
    next(error);
  }
}

async function addFavorite(req, res, next) {
  try {
    const propertyId = String(req.params.propertyId || "").trim();
    if (!propertyId) {
      return res.status(400).json({ message: "propertyId erforderlich." });
    }
    if (dialect === "postgres") {
      await query(
        `INSERT INTO user_favorites (user_id, property_id) VALUES (?, ?)
         ON CONFLICT DO NOTHING`,
        [req.user.id, propertyId]
      );
    } else {
      await query(
        "INSERT IGNORE INTO user_favorites (user_id, property_id) VALUES (?, ?)",
        [req.user.id, propertyId]
      );
    }
    res.status(201).json({ ok: true, propertyId });
  } catch (error) {
    next(error);
  }
}

async function removeFavorite(req, res, next) {
  try {
    const propertyId = String(req.params.propertyId || "").trim();
    await query("DELETE FROM user_favorites WHERE user_id = ? AND property_id = ?", [
      req.user.id,
      propertyId
    ]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function flagListing(req, res, next) {
  try {
    const propertyId = String(req.body?.propertyId || req.body?.property_id || "").trim();
    const flagType = String(req.body?.flagType || req.body?.flag_type || "inactive").trim().slice(0, 30);
    const comment = String(req.body?.comment || "").trim().slice(0, 500);
    if (!propertyId) {
      return res.status(400).json({ message: "propertyId erforderlich." });
    }
    if (dialect === "postgres") {
      await query(
        `INSERT INTO listing_crowd_flags (property_id, user_id, flag_type, comment)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (property_id, user_id, flag_type) DO UPDATE SET comment = EXCLUDED.comment, created_at = NOW()`,
        [propertyId, req.user.id, flagType, comment || null]
      );
    } else {
      await query(
        `INSERT INTO listing_crowd_flags (property_id, user_id, flag_type, comment)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE comment = VALUES(comment), created_at = CURRENT_TIMESTAMP`,
        [propertyId, req.user.id, flagType, comment || null]
      );
    }
    res.status(201).json({ ok: true, propertyId, flagType });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  listFavorites,
  addFavorite,
  removeFavorite,
  flagListing
};
