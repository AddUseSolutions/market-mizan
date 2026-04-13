const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { query, dialect } = require("../db/connection");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || undefined);

function buildTokenPayload(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone || "",
    role: user.role
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

async function createUser({ firstName, lastName, email, phone, passwordHash, provider }) {
  if (dialect === "postgres") {
    const [rows] = await query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, provider, role)
       VALUES (?, ?, ?, ?, ?, ?, 'user')
       RETURNING *`,
      [firstName, lastName, email, phone || null, passwordHash || null, provider]
    );
    return rows[0];
  }

  const insertSql =
    "INSERT INTO users (first_name, last_name, email, phone, password_hash, provider, role) VALUES (?, ?, ?, ?, ?, ?, 'user')";
  const [result] = await query(insertSql, [
    firstName,
    lastName,
    email,
    phone || null,
    passwordHash || null,
    provider
  ]);
  const userId = result.insertId;
  const [rows] = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
  return rows[0];
}

async function register(req, res, next) {
  try {
    const firstName = normalizeString(req.body?.firstName, 80);
    const lastName = normalizeString(req.body?.lastName, 80);
    const email = normalizeEmail(req.body?.email);
    const phone = normalizeString(req.body?.phone, 40);
    const password = String(req.body?.password || "");

    if (!firstName || !lastName) {
      return res.status(400).json({ message: "Vorname und Nachname sind erforderlich." });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Bitte gib eine gueltige E-Mail ein." });
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
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
      provider: "local"
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

async function googleLogin(req, res, next) {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: "Google Login ist nicht konfiguriert." });
    }
    const credential = String(req.body?.credential || "");
    if (!credential) {
      return res.status(400).json({ message: "Google-Token fehlt." });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payloadGoogle = ticket.getPayload();
    const email = normalizeEmail(payloadGoogle?.email);
    if (!email) {
      return res.status(400).json({ message: "Google-Konto ohne E-Mail ist nicht erlaubt." });
    }

    let user = await findUserByEmail(email);
    if (!user) {
      const firstName = normalizeString(payloadGoogle?.given_name || "Google", 80);
      const lastName = normalizeString(payloadGoogle?.family_name || "User", 80);
      user = await createUser({
        firstName,
        lastName,
        email,
        phone: "",
        passwordHash: null,
        provider: "google"
      });
    }

    const authPayload = buildTokenPayload(user);
    res.json({ token: signToken(authPayload), user: authPayload });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  googleLogin
};
