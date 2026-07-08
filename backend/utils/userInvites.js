const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { query, dialect } = require("../db/connection");

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function generateInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function ensureInviteSchema() {
  if (dialect === "postgres") {
    await query(`
      CREATE TABLE IF NOT EXISTS user_invites (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query("CREATE INDEX IF NOT EXISTS idx_user_invites_token ON user_invites (token_hash)");
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS user_invites (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash VARCHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_invites_token (token_hash),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

async function createInviteForUser(userId, { expiresInHours = 72 } = {}) {
  await ensureInviteSchema();
  const token = generateInviteToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  await query(
    `INSERT INTO user_invites (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt]
  );

  return { token, expiresAt };
}

async function findValidInvite(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const [rows] = await query(
    `SELECT ui.*, u.email, u.role, u.first_name, u.last_name
     FROM user_invites ui
     JOIN users u ON u.id = ui.user_id
     WHERE ui.token_hash = ? AND ui.used_at IS NULL AND ui.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function markInviteUsed(inviteId) {
  await query("UPDATE user_invites SET used_at = NOW() WHERE id = ?", [inviteId]);
}

async function setUserPassword(userId, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  await query("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [passwordHash, userId]);
}

function resolvePublicFrontendUrl() {
  const canonical = String(
    process.env.PUBLIC_SITE_URL || process.env.CANONICAL_FRONTEND_URL || ""
  )
    .trim()
    .replace(/\/$/, "");
  if (canonical) return canonical;

  const frontend = String(process.env.FRONTEND_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (frontend && !/onrender\.com/i.test(frontend)) return frontend;

  return "https://mmizan.com";
}

function buildSetPasswordUrl(token) {
  const base = resolvePublicFrontendUrl();
  return `${base}/set-password?token=${encodeURIComponent(token)}`;
}

module.exports = {
  ensureInviteSchema,
  createInviteForUser,
  findValidInvite,
  markInviteUsed,
  setUserPassword,
  resolvePublicFrontendUrl,
  buildSetPasswordUrl,
  generateInviteToken
};
