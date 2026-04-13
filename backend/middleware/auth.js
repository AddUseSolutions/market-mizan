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
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Nur Admin erlaubt." });
  }
  return next();
}

module.exports = {
  requireAuth,
  requireAdmin
};
