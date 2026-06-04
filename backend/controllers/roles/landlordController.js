const { query } = require("../../db/connection");

async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const [profileRows] = await query(
      "SELECT display_name, preferred_contact, audio_upload_ready FROM landlord_profiles WHERE user_id = ? LIMIT 1",
      [userId]
    );
    const [listingCount] = await query(
      "SELECT COUNT(*) AS c FROM listing_submissions WHERE submitter_email = (SELECT email FROM users WHERE id = ? LIMIT 1)",
      [userId]
    ).catch(() => [[{ c: 0 }]]);

    res.json({
      role: "PRIVATE_LANDLORD",
      profile: profileRows[0] || null,
      stats: {
        submissions: Number(listingCount[0]?.c || 0)
      },
      features: ["simple_upload", "audio_upload_preview"]
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const displayName = String(req.body?.displayName || req.body?.display_name || "").trim().slice(0, 200);
    const preferredContact = String(req.body?.preferredContact || "email").trim().slice(0, 50);
    await query(
      `INSERT INTO landlord_profiles (user_id, display_name, preferred_contact)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, preferred_contact = EXCLUDED.preferred_contact, updated_at = NOW()`,
      [req.user.id, displayName || null, preferredContact]
    ).catch(async () => {
      await query(
        "UPDATE landlord_profiles SET display_name = ?, preferred_contact = ? WHERE user_id = ?",
        [displayName, preferredContact, req.user.id]
      );
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboard, updateProfile };
