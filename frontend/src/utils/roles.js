export function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

export function isAdminUser(user) {
  return normalizeRole(user?.role) === "ADMIN";
}
