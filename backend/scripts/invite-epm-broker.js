#!/usr/bin/env node
/**
 * Create EPM Global broker invite for property@epmglobal.com
 * Usage: node backend/scripts/invite-epm-broker.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const bcrypt = require("bcryptjs");
const { query, dialect } = require("../db/connection");
const { ROLES } = require("../constants/roles");
const { ensureRbacSchema } = require("../db/ensureRbacSchema");
const { ensureInviteSchema, createInviteForUser, buildSetPasswordUrl } = require("../utils/userInvites");
const { sendMail } = require("../utils/mail");
const { ensureRoleProfile } = require("../controllers/userAdminController");

const EMAIL = "property@epmglobal.com";
const AGENCY = "EPM Global";

async function main() {
  await ensureRbacSchema();
  await ensureInviteSchema();

  const [existing] = await query("SELECT * FROM users WHERE email = ? LIMIT 1", [EMAIL]);
  let user = existing[0];

  if (!user) {
    const placeholderHash = await bcrypt.hash(`invite-${Date.now()}`, 10);
    if (dialect === "postgres") {
      const [rows] = await query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
         VALUES (?, ?, ?, ?, ?, TRUE) RETURNING *`,
        [EMAIL, placeholderHash, ROLES.AGENCY_BROKER, "EPM", "Global"]
      );
      user = rows[0];
    } else {
      const [result] = await query(
        "INSERT INTO users (email, password_hash, role, first_name, last_name, is_active) VALUES (?, ?, ?, ?, ?, TRUE)",
        [EMAIL, placeholderHash, ROLES.AGENCY_BROKER, "EPM", "Global"]
      );
      const [rows] = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [result.insertId]);
      user = rows[0];
    }
    console.log("Created user:", user.id, user.email);
  } else {
    console.log("User already exists:", user.id, user.email);
    await query("UPDATE users SET role = ? WHERE id = ?", [ROLES.AGENCY_BROKER, user.id]);
  }

  await ensureRoleProfile(user, { agencyName: AGENCY, autoVerify: true });
  const { token } = await createInviteForUser(user.id);
  const setPasswordUrl = buildSetPasswordUrl(token);

  const mailResult = await sendMail({
    to: EMAIL,
    subject: "Welcome to Market Mizan — set your EPM Global broker password",
    text: [
      "Hello EPM Global team,",
      "",
      "Your trusted broker account on Market Mizan is ready.",
      "Set your password (valid 72 hours):",
      setPasswordUrl,
      "",
      "Your listings will be verified and published instantly.",
      "",
      "— Market Mizan"
    ].join("\n"),
    html: `
      <p>Hello EPM Global team,</p>
      <p>Your trusted broker account on <strong>Market Mizan</strong> is ready.</p>
      <p><a href="${setPasswordUrl}">Set your password</a> (valid 72 hours)</p>
      <p>Your listings will be verified and published instantly.</p>
      <p>— Market Mizan</p>
    `
  });

  console.log("Invite sent:", mailResult.ok ? "yes" : mailResult.reason || "no");
  if (!mailResult.ok) {
    console.log("Set-password URL (share manually if email failed):");
    console.log(setPasswordUrl);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
