const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query, dialect } = require("../db/connection");
const {
  ROLES,
  ALL_ROLES,
  SELF_REGISTER_ROLES,
  normalizeRole,
  canSelfRegister
} = require("../constants/roles");
const {
  findValidInvite,
  markInviteUsed,
  setUserPassword
} = require("../utils/userInvites");

function buildTokenPayload(user) {
  return {
    id: user.id,
    email: user.email,
    role: normalizeRole(user.role),
    firstName: user.first_name || null,
    lastName: user.last_name || null,
    isActive: user.is_active !== false,
    createdAt: user.created_at
  };
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || "dev-secret-change-me", {
    expiresIn: "7d"
  });
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeString(value, maxLen) {
  return String(value || "").trim().slice(0, maxLen);
}

async function findUserByEmail(email) {
  const [rows] = await query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function createUser({ email, passwordHash, role, firstName, lastName, phone }) {
  const normalizedRole = normalizeRole(role);
  if (dialect === "postgres") {
    const [rows] = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING *`,
      [email, passwordHash, normalizedRole, firstName || email.split("@")[0].slice(0, 100), lastName || null, phone || null]
    );
    return rows[0];
  }

  const [result] = await query(
    "INSERT INTO users (email, password_hash, role, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?)",
    [email, passwordHash, normalizedRole, firstName || email.split("@")[0].slice(0, 100), lastName || null, phone || null]
  );
  const [rows] = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [result.insertId]);
  return rows[0];
}

async function ensureRoleProfile(user) {
  const role = normalizeRole(user.role);
  const userId = user.id;

  if (role === ROLES.AGENCY_BROKER) {
    const [existing] = await query("SELECT user_id FROM agency_profiles WHERE user_id = ? LIMIT 1", [userId]);
    if (!existing.length) {
      await query(
        "INSERT INTO agency_profiles (user_id, agency_name) VALUES (?, ?)",
        [userId, user.first_name ? `${user.first_name} Agency` : "My Agency"]
      );
    }
  }

  if (role === ROLES.PRIVATE_LANDLORD) {
    const [existing] = await query("SELECT user_id FROM landlord_profiles WHERE user_id = ? LIMIT 1", [userId]);
    if (!existing.length) {
      await query(
        "INSERT INTO landlord_profiles (user_id, display_name) VALUES (?, ?)",
        [userId, user.first_name || user.email.split("@")[0]]
      );
    }
  }

  if (role === ROLES.PREMIUM_BUYER) {
    const [existing] = await query("SELECT user_id FROM premium_subscriptions WHERE user_id = ? LIMIT 1", [userId]);
    if (!existing.length) {
      await query("INSERT INTO premium_subscriptions (user_id, tier, is_active) VALUES (?, 'premium', TRUE)", [userId]);
    }
  }
}

function resolveRegisterRole(requested) {
  const upper = String(requested || ROLES.STANDARD_USER).trim().toUpperCase();
  if (upper === "SELLER") return ROLES.PRIVATE_LANDLORD;
  if (upper === "INTERESTED") return ROLES.STANDARD_USER;
  return normalizeRole(upper);
}

async function register(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const role = resolveRegisterRole(req.body?.role);
    const firstName =
      normalizeString(req.body?.firstName || req.body?.first_name, 100) ||
      email.split("@")[0].slice(0, 100);
    const lastName = normalizeString(req.body?.lastName || req.body?.last_name, 100) || null;
    const phone = normalizeString(req.body?.phone, 40);
    const agencyName = normalizeString(req.body?.agencyName || req.body?.agency_name, 255);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Bitte gib eine gueltige E-Mail-Adresse ein." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Passwort muss mindestens 6 Zeichen haben." });
    }
    if (!canSelfRegister(role)) {
      return res.status(403).json({
        message: "Diese Rolle kann nur durch einen Administrator zugewiesen werden.",
        allowedRoles: SELF_REGISTER_ROLES
      });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "Benutzer mit dieser E-Mail existiert bereits." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      email,
      passwordHash,
      role,
      firstName,
      lastName,
      phone
    });

    if (role === ROLES.AGENCY_BROKER && agencyName) {
      await query("UPDATE agency_profiles SET agency_name = ? WHERE user_id = ?", [agencyName, user.id]).catch(() => {});
    }

    await ensureRoleProfile(user);

    const payload = buildTokenPayload(user);
    res.status(201).json({ token: signToken(payload), user: payload });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const user = await findUserByEmail(email);

    if (!user || !user.password_hash) {
      return res.status(401).json({ message: "Login fehlgeschlagen." });
    }
    if (user.is_active === false || user.is_active === 0) {
      return res.status(403).json({ message: "Konto deaktiviert." });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Login fehlgeschlagen." });
    }

    const payload = buildTokenPayload(user);
    res.json({ token: signToken(payload), user: payload });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Benutzer nicht gefunden." });
    }
    res.json({ user: buildTokenPayload(user) });
  } catch (error) {
    next(error);
  }
}

async function listRoles(req, res) {
  const [rows] = await query("SELECT code, label, description FROM user_roles ORDER BY code");
  res.json({
    roles: rows,
    selfRegisterRoles: SELF_REGISTER_ROLES,
    allRoles: ALL_ROLES
  });
}

async function setPasswordFromInvite(req, res, next) {
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");
    if (!token) return res.status(400).json({ message: "Invite token is required." });
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const invite = await findValidInvite(token);
    if (!invite) {
      return res.status(400).json({ message: "Invite link is invalid or expired." });
    }

    await setUserPassword(invite.user_id, password);
    await markInviteUsed(invite.id);

    const user = await findUserById(invite.user_id);
    const payload = buildTokenPayload(user);
    res.json({ ok: true, token: signToken(payload), user: payload });
  } catch (error) {
    next(error);
  }
}

async function validateInviteToken(req, res, next) {
  try {
    const token = String(req.query?.token || req.body?.token || "").trim();
    const invite = await findValidInvite(token);
    if (!invite) return res.status(400).json({ valid: false });
    res.json({
      valid: true,
      email: invite.email,
      role: normalizeRole(invite.role),
      firstName: invite.first_name,
      lastName: invite.last_name
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  me,
  listRoles,
  setPasswordFromInvite,
  validateInviteToken,
  buildTokenPayload
};
