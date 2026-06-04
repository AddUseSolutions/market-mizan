/**
 * Mizan RBAC — Rollen, Berechtigungen, Registrierungsregeln.
 * PostgreSQL speichert role als VARCHAR(30) auf users.role.
 */

const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  AGENCY_BROKER: "AGENCY_BROKER",
  PRIVATE_LANDLORD: "PRIVATE_LANDLORD",
  PREMIUM_BUYER: "PREMIUM_BUYER",
  STANDARD_USER: "STANDARD_USER"
});

/** Legacy-Rollen → neues RBAC (Migration + Token-Kompatibilität). */
const LEGACY_ROLE_MAP = Object.freeze({
  INTERESTED: ROLES.STANDARD_USER,
  USER: ROLES.STANDARD_USER,
  SELLER: ROLES.PRIVATE_LANDLORD,
  ADMIN: ROLES.ADMIN
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));

/** Rollen, die sich ohne Admin-Einladung registrieren dürfen. */
const SELF_REGISTER_ROLES = Object.freeze([
  ROLES.STANDARD_USER,
  ROLES.PRIVATE_LANDLORD,
  ROLES.AGENCY_BROKER
]);

const PERMISSIONS = Object.freeze({
  SYSTEM_FULL: [ROLES.ADMIN],
  MODERATE_LISTINGS: [ROLES.ADMIN],
  VERIFY_LISTINGS: [ROLES.ADMIN],
  RUN_SCRAPER: [ROLES.ADMIN],
  AGENCY_DASHBOARD: [ROLES.ADMIN, ROLES.AGENCY_BROKER],
  BULK_UPLOAD: [ROLES.ADMIN, ROLES.AGENCY_BROKER],
  MANAGE_LEADS: [ROLES.ADMIN, ROLES.AGENCY_BROKER],
  LANDLORD_DASHBOARD: [ROLES.ADMIN, ROLES.PRIVATE_LANDLORD, ROLES.AGENCY_BROKER],
  UPLOAD_LISTING: [ROLES.ADMIN, ROLES.PRIVATE_LANDLORD, ROLES.AGENCY_BROKER],
  PREMIUM_ANALYTICS: [ROLES.ADMIN, ROLES.PREMIUM_BUYER],
  MARKET_TRENDS: [ROLES.ADMIN, ROLES.PREMIUM_BUYER],
  WATCHLIST: [ROLES.ADMIN, ROLES.STANDARD_USER, ROLES.PREMIUM_BUYER, ROLES.PRIVATE_LANDLORD, ROLES.AGENCY_BROKER],
  FLAG_LISTING: [ROLES.ADMIN, ROLES.STANDARD_USER, ROLES.PREMIUM_BUYER],
  CONTACT_BROKER: [ROLES.ADMIN, ROLES.STANDARD_USER, ROLES.PREMIUM_BUYER, ROLES.PRIVATE_LANDLORD, ROLES.AGENCY_BROKER]
});

function normalizeRole(role) {
  const upper = String(role || ROLES.STANDARD_USER).trim().toUpperCase();
  if (ALL_ROLES.includes(upper)) return upper;
  if (LEGACY_ROLE_MAP[upper]) return LEGACY_ROLE_MAP[upper];
  return ROLES.STANDARD_USER;
}

function isAdmin(role) {
  return normalizeRole(role) === ROLES.ADMIN;
}

function hasPermission(role, permission) {
  const normalized = normalizeRole(role);
  if (normalized === ROLES.ADMIN) return true;
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(normalized);
}

function canSelfRegister(role) {
  return SELF_REGISTER_ROLES.includes(normalizeRole(role));
}

module.exports = {
  ROLES,
  ALL_ROLES,
  LEGACY_ROLE_MAP,
  SELF_REGISTER_ROLES,
  PERMISSIONS,
  normalizeRole,
  isAdmin,
  hasPermission,
  canSelfRegister
};
