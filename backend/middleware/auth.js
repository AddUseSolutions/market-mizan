const jwt = require("jsonwebtoken");
const { normalizeRole, isAdmin, hasPermission } = require("../constants/roles");

const JWT_SECRET = () => process.env.JWT_SECRET || "dev-secret-change-me";

function extractToken(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

function attachUserFromToken(req) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return null;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET());
    req.user = {
      ...payload,
      role: normalizeRole(payload.role)
    };
    return req.user;
  } catch {
    req.user = null;
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = attachUserFromToken(req);
  if (!user) {
    return res.status(401).json({ message: "Nicht eingeloggt." });
  }
  if (user.isActive === false) {
    return res.status(403).json({ message: "Konto deaktiviert." });
  }
  return next();
}

function optionalAuth(req, res, next) {
  attachUserFromToken(req);
  return next();
}

/**
 * @param {...string} roles - e.g. checkRole('ADMIN', 'AGENCY_BROKER')
 * Must run after requireAuth.
 */
function checkRole(...roles) {
  const allowed = new Set(roles.map((r) => normalizeRole(r)));
  return (req, res, next) => {
    const role = normalizeRole(req.user?.role);
    if (!req.user) {
      return res.status(401).json({ message: "Nicht eingeloggt." });
    }
    if (isAdmin(role) || allowed.has(role)) {
      req.user.role = role;
      return next();
    }
    return res.status(403).json({ message: "Keine Berechtigung fuer diese Aktion." });
  };
}

/** Shorthand: requireAuth + checkRole in one middleware chain factory. */
function requireRoles(...roles) {
  return [requireAuth, checkRole(...roles)];
}

/**
 * Permission-based guard (see constants/roles.js PERMISSIONS).
 * ADMIN always passes.
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Nicht eingeloggt." });
    }
    const role = normalizeRole(req.user.role);
    if (!hasPermission(role, permission)) {
      return res.status(403).json({ message: "Keine Berechtigung fuer diese Aktion." });
    }
    req.user.role = role;
    return next();
  };
}

function requireAdmin(req, res, next) {
  return checkRole("ADMIN")(req, res, next);
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  checkRole,
  requireRoles,
  requirePermission,
  normalizeRole,
  attachUserFromToken
};
