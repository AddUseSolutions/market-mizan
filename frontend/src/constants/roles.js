export const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  AGENCY_BROKER: "AGENCY_BROKER",
  PRIVATE_LANDLORD: "PRIVATE_LANDLORD",
  PREMIUM_BUYER: "PREMIUM_BUYER",
  STANDARD_USER: "STANDARD_USER"
});

export function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

export function isAdmin(userOrRole) {
  const role = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  return normalizeRole(role) === ROLES.ADMIN;
}

export function hasAnyRole(user, ...roles) {
  const r = normalizeRole(user?.role);
  if (r === ROLES.ADMIN) return true;
  return roles.map(normalizeRole).includes(r);
}
