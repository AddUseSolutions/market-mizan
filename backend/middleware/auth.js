const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return res.status(401).json({ message: "Nicht eingeloggt." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret-change-me");
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Session ungueltig." });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || String(req.user.role).toUpperCase() !== "ADMIN") {
    return res.status(403).json({ message: "Nur Admin erlaubt." });
  }
  return next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "dev-secret-change-me");
  } catch {
    req.user = null;
  }
  return next();
}

function checkRole(...roles) {
  const allowed = new Set(roles.map((r) => String(r).toUpperCase()));
  return (req, res, next) => {
    const role = String(req.user?.role || "").toUpperCase();
    if (!allowed.has(role)) {
      return res.status(403).json({ message: "Keine Berechtigung fuer diese Aktion." });
    }
    return next();
  };
}

module.exports = {
  requireAuth,
  requireAdmin,
  checkRole,
  optionalAuth
};
