const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query, dialect } = require("../db/connection");

function buildTokenPayload(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
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

async function createUser({ email, passwordHash, role }) {
  if (dialect === "postgres") {
    const [rows] = await query(
      `INSERT INTO users (email, password_hash, role)
       VALUES (?, ?, ?)
       RETURNING *`,
      [email, passwordHash, role]
    );
    return rows[0];
  }

  const insertSql =
    "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)";
  const [result] = await query(insertSql, [
    email,
    passwordHash,
    role
  ]);
  const userId = result.insertId;
  const [rows] = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
  return rows[0];
}

async function register(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const requestedRole = normalizeString(req.body?.role, 20).toUpperCase();
    const role = requestedRole === "SELLER" ? "SELLER" : "INTERESTED";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Bitte gib eine gueltige E-Mail-Adresse ein." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Passwort muss mindestens 6 Zeichen haben." });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "Benutzer mit dieser E-Mail existiert bereits." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      email,
      passwordHash,
      role
    });
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

module.exports = {
  register,
  login
};
