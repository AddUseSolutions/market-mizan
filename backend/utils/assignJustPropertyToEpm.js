const { query } = require("../db/connection");
const { ROLES } = require("../constants/roles");

const EPM_EMAIL = "property@epmglobal.com";
const DEFAULT_AGENCY = "EPM Global";
const DEFAULT_SHORT = "EPMGlobal";

/**
 * Assign all active Just Property listings to the EPM broker account,
 * mark them verified, and set source_name to the broker short name.
 */
async function assignJustPropertyListingsToEpm({
  email = EPM_EMAIL,
  agencyName = DEFAULT_AGENCY,
  shortName = DEFAULT_SHORT
} = {}) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  const [users] = await query("SELECT * FROM users WHERE email = ? LIMIT 1", [normalizedEmail]);
  if (!users.length) {
    const err = new Error(`Broker user not found: ${normalizedEmail}`);
    err.status = 404;
    throw err;
  }
  const user = users[0];
  if (String(user.role) !== ROLES.AGENCY_BROKER) {
    await query("UPDATE users SET role = ? WHERE id = ?", [ROLES.AGENCY_BROKER, user.id]);
  }

  const name = String(agencyName || DEFAULT_AGENCY).trim().slice(0, 255) || DEFAULT_AGENCY;
  const short = String(shortName || DEFAULT_SHORT).trim().slice(0, 10) || DEFAULT_SHORT;

  const [profiles] = await query("SELECT user_id FROM agency_profiles WHERE user_id = ? LIMIT 1", [user.id]);
  if (!profiles.length) {
    await query(
      "INSERT INTO agency_profiles (user_id, agency_name, short_name, auto_verify_listings) VALUES (?, ?, ?, TRUE)",
      [user.id, name, short]
    );
  } else {
    await query(
      `UPDATE agency_profiles
       SET agency_name = COALESCE(NULLIF(?, ''), agency_name),
           short_name = COALESCE(NULLIF(?, ''), short_name),
           auto_verify_listings = TRUE
       WHERE user_id = ?`,
      [name, short, user.id]
    );
  }

  const [profileRows] = await query(
    "SELECT agency_name, short_name FROM agency_profiles WHERE user_id = ? LIMIT 1",
    [user.id]
  );
  const sourceName =
    String(profileRows[0]?.short_name || profileRows[0]?.agency_name || short).trim().slice(0, 255) ||
    short;

  const [beforeRows] = await query(
    `SELECT COUNT(*) AS c FROM properties
     WHERE is_active = TRUE AND source_website = 'just.property'`
  );
  const totalJp = Number(beforeRows[0]?.c || 0);

  await query(
    `UPDATE properties
     SET owner_id = ?,
         source_name = ?,
         verification_status = 'verified',
         publisher_type = 'broker',
         is_paid = TRUE,
         verified_at = COALESCE(verified_at, NOW()),
         last_seen = NOW()
     WHERE is_active = TRUE
       AND source_website = 'just.property'`,
    [user.id, sourceName]
  );

  const [ownedRows] = await query(
    `SELECT COUNT(*) AS c FROM properties
     WHERE is_active = TRUE AND owner_id = ?`,
    [user.id]
  );
  const [verifiedRows] = await query(
    `SELECT COUNT(*) AS c FROM properties
     WHERE is_active = TRUE AND owner_id = ? AND verification_status = 'verified'`,
    [user.id]
  );

  return {
    ok: true,
    email: normalizedEmail,
    userId: user.id,
    agencyName: name,
    shortName: sourceName,
    justPropertyAssigned: totalJp,
    ownedActive: Number(ownedRows[0]?.c || 0),
    verifiedActive: Number(verifiedRows[0]?.c || 0)
  };
}

module.exports = {
  EPM_EMAIL,
  DEFAULT_AGENCY,
  DEFAULT_SHORT,
  assignJustPropertyListingsToEpm
};
