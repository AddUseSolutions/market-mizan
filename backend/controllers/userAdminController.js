const bcrypt = require("bcryptjs");
const { query, dialect } = require("../db/connection");
const { ROLES, normalizeRole, ALL_ROLES } = require("../constants/roles");
const { sendMail } = require("../utils/mail");
const { buildInviteEmail } = require("../utils/inviteEmail");
const {
  createInviteForUser,
  buildSetPasswordUrl,
  ensureInviteSchema
} = require("../utils/userInvites");

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

async function ensureRoleProfile(user, { agencyName, autoVerify } = {}) {
  const role = normalizeRole(user.role);
  const userId = user.id;

  if (role === ROLES.AGENCY_BROKER) {
    const [existing] = await query("SELECT user_id FROM agency_profiles WHERE user_id = ? LIMIT 1", [userId]);
    const name = agencyName || user.first_name || "Agency";
    if (!existing.length) {
      await query(
        "INSERT INTO agency_profiles (user_id, agency_name, auto_verify_listings) VALUES (?, ?, ?)",
        [userId, name, Boolean(autoVerify)]
      );
    } else if (agencyName || autoVerify) {
      await query(
        "UPDATE agency_profiles SET agency_name = COALESCE(?, agency_name), auto_verify_listings = COALESCE(?, auto_verify_listings) WHERE user_id = ?",
        [agencyName || null, autoVerify == null ? null : Boolean(autoVerify), userId]
      );
    }
  }
}

async function listUsers(req, res, next) {
  try {
    const [rows] = await query(
      `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.is_active, u.created_at,
              ap.agency_name, ap.auto_verify_listings
       FROM users u
       LEFT JOIN agency_profiles ap ON ap.user_id = u.id
       ORDER BY u.created_at DESC
       LIMIT 200`
    );
    res.json({ users: rows });
  } catch (error) {
    next(error);
  }
}

async function createUserInvite(req, res, next) {
  try {
    await ensureInviteSchema();
    const email = normalizeEmail(req.body?.email);
    const role = normalizeRole(req.body?.role || ROLES.AGENCY_BROKER);
    const firstName = String(req.body?.firstName || req.body?.first_name || "").trim().slice(0, 100);
    const lastName = String(req.body?.lastName || req.body?.last_name || "").trim().slice(0, 100) || null;
    const agencyName = String(req.body?.agencyName || req.body?.agency_name || "").trim().slice(0, 255) || null;
    const autoVerify = Boolean(req.body?.autoVerify ?? req.body?.auto_verify_listings);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Valid email is required." });
    }
    if (!ALL_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const [existing] = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existing.length) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    const placeholderHash = await bcrypt.hash(`invite-${Date.now()}-${Math.random()}`, 10);
    let user;
    if (dialect === "postgres") {
      const [rows] = await query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
         VALUES (?, ?, ?, ?, ?, TRUE) RETURNING *`,
        [email, placeholderHash, role, firstName || email.split("@")[0], lastName]
      );
      user = rows[0];
    } else {
      const [result] = await query(
        "INSERT INTO users (email, password_hash, role, first_name, last_name, is_active) VALUES (?, ?, ?, ?, ?, TRUE)",
        [email, placeholderHash, role, firstName || email.split("@")[0], lastName]
      );
      const [rows] = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [result.insertId]);
      user = rows[0];
    }

    await ensureRoleProfile(user, { agencyName, autoVerify });

    const { token } = await createInviteForUser(user.id);
    const setPasswordUrl = buildSetPasswordUrl(token);
    const emailContent = buildInviteEmail({
      firstName: firstName || user.first_name,
      email,
      agencyName,
      setPasswordUrl,
      role
    });

    const mailResult = await sendMail({
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    });

    res.status(201).json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      },
      inviteSent: mailResult.ok,
      setPasswordUrl,
      mailError: mailResult.ok ? undefined : mailResult.reason
    });
  } catch (error) {
    next(error);
  }
}

async function resendUserInvite(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const [rows] = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
    if (!rows.length) return res.status(404).json({ message: "User not found." });
    const user = rows[0];

    const { token } = await createInviteForUser(user.id);
    const setPasswordUrl = buildSetPasswordUrl(token);
    const emailContent = buildInviteEmail({
      firstName: user.first_name,
      email: user.email,
      agencyName: null,
      setPasswordUrl,
      role: user.role
    });
    const mailResult = await sendMail({
      to: user.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    });

    res.json({
      ok: true,
      inviteSent: mailResult.ok,
      setPasswordUrl,
      mailError: mailResult.ok ? undefined : mailResult.reason
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { listUsers, createUserInvite, resendUserInvite, ensureRoleProfile };
