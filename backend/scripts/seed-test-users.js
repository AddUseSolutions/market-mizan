#!/usr/bin/env node
/**
 * Seed fixed RBAC test accounts (password: Test1234! for all).
 * Usage: cd backend && npm run db:seed-test-users
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const bcrypt = require("bcryptjs");
const { query, dialect } = require("../db/connection");
const { ROLES } = require("../constants/roles");
const { ensureRbacSchema } = require("../db/ensureRbacSchema");

const TEST_PASSWORD = process.env.SEED_TEST_PASSWORD || "Test1234!";

const TEST_USERS = [
  { email: "admin@mizan.local", role: ROLES.ADMIN, firstName: "Test", lastName: "Admin" },
  { email: "broker@mizan.local", role: ROLES.AGENCY_BROKER, firstName: "Test", lastName: "Broker" },
  { email: "landlord@mizan.local", role: ROLES.PRIVATE_LANDLORD, firstName: "Test", lastName: "Landlord" },
  { email: "premium@mizan.local", role: ROLES.PREMIUM_BUYER, firstName: "Test", lastName: "Premium" },
  { email: "user@mizan.local", role: ROLES.STANDARD_USER, firstName: "Test", lastName: "User" }
];

async function upsertUser({ email, role, firstName, lastName, passwordHash }) {
  const [existing] = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing.length) {
    await query(
      `UPDATE users SET password_hash = ?, role = ?, first_name = ?, last_name = ?, is_active = TRUE WHERE email = ?`,
      [passwordHash, role, firstName, lastName, email]
    );
    return existing[0].id;
  }

  if (dialect === "postgres") {
    const [rows] = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE) RETURNING id`,
      [email, passwordHash, role, firstName, lastName]
    );
    return rows[0].id;
  }

  const [result] = await query(
    "INSERT INTO users (email, password_hash, role, first_name, last_name, is_active) VALUES (?, ?, ?, ?, ?, TRUE)",
    [email, passwordHash, role, firstName, lastName]
  );
  return result.insertId;
}

async function ensureRoleProfile(userId, role, firstName, email) {
  if (role === ROLES.AGENCY_BROKER) {
    const [rows] = await query("SELECT user_id FROM agency_profiles WHERE user_id = ? LIMIT 1", [userId]);
    if (!rows.length) {
      await query("INSERT INTO agency_profiles (user_id, agency_name) VALUES (?, ?)", [
        userId,
        `${firstName} Test Agency`
      ]);
    }
  }
  if (role === ROLES.PRIVATE_LANDLORD) {
    const [rows] = await query("SELECT user_id FROM landlord_profiles WHERE user_id = ? LIMIT 1", [userId]);
    if (!rows.length) {
      await query("INSERT INTO landlord_profiles (user_id, display_name) VALUES (?, ?)", [userId, firstName]);
    }
  }
  if (role === ROLES.PREMIUM_BUYER) {
    const [rows] = await query("SELECT user_id FROM premium_subscriptions WHERE user_id = ? LIMIT 1", [userId]);
    if (!rows.length) {
      await query(
        "INSERT INTO premium_subscriptions (user_id, tier, is_active) VALUES (?, 'premium', TRUE)",
        [userId]
      );
    }
  }
}

async function main() {
  await ensureRbacSchema();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const results = [];

  for (const u of TEST_USERS) {
    const userId = await upsertUser({ ...u, passwordHash });
    await ensureRoleProfile(userId, u.role, u.firstName, u.email);
    results.push({ email: u.email, role: u.role, userId });
  }

  console.log(JSON.stringify({ ok: true, password: TEST_PASSWORD, users: results }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
