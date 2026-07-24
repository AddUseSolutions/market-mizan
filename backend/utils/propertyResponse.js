const { normalizeRole } = require("../constants/roles");
const { cleanTitle } = require("./cleanTitle");
const { sanitizeListingImages } = require("./sanitizeListingImages");

const EPM_EDIT_EMAIL = "property@epmglobal.com";

function canEditThirdPartyListings(email) {
  return String(email || "").trim().toLowerCase() === EPM_EDIT_EMAIL;
}

function canUserEditListing(user, row) {
  if (!user || !row) return false;
  const role = normalizeRole(user.role);
  if (role === "ADMIN") return true;
  if (role !== "AGENCY_BROKER") return false;
  if (Number(row.owner_id) === Number(user.id)) return true;
  if (canEditThirdPartyListings(user.email) && row.source_website === "just.property") return true;
  return false;
}

function resolveDescriptionOriginal(row) {
  const original = row?.description_original ?? row?.description ?? null;
  if (original == null) return null;
  const text = String(original).trim();
  return text || null;
}

function resolveDescriptionSummary(row) {
  const summary = row?.description_summary ?? null;
  if (summary == null) return null;
  const text = String(summary).trim();
  return text || null;
}

function isInAddisBounds(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  if (la === 0 && lo === 0) return false;
  return la >= 8.75 && la <= 9.15 && lo >= 38.55 && lo <= 39.05;
}

const WRONG_CITY_RE = /dire\s*dawa|hawassa|bahir\s*dar|mekelle|gondar|adama|jimma|harar|jijiga/i;

function sanitizeMapFields(row) {
  if (!isInAddisBounds(row.latitude, row.longitude)) {
    row.latitude = null;
    row.longitude = null;
  }
  if (row.google_maps_url && WRONG_CITY_RE.test(String(row.google_maps_url))) {
    row.google_maps_url = null;
  }
  return row;
}

/**
 * RBAC: only ADMIN receives description_summary in API responses.
 * All clients receive the original text via `description` (and description_original).
 * Authenticated brokers/admins get `can_edit` for assigned (or EPM JP) listings.
 */
function sanitizePropertyForClient(row, user) {
  if (!row) return row;
  const out = { ...row };
  const original = resolveDescriptionOriginal(out);
  const summary = resolveDescriptionSummary(out);
  const isAdmin = user && normalizeRole(user.role) === "ADMIN";

  out.description_original = original;
  out.description = original;

  if (out.title) {
    out.title = cleanTitle(out.title) || out.title;
  }

  out.images = sanitizeListingImages(out.images);
  out.can_edit = canUserEditListing(user, row);

  // Don't leak owner_id to anonymous clients.
  if (!user) {
    delete out.owner_id;
  }

  if (isAdmin) {
    out.description_summary = summary;
  } else {
    delete out.description_summary;
  }

  return sanitizeMapFields(out);
}

module.exports = {
  resolveDescriptionOriginal,
  resolveDescriptionSummary,
  sanitizePropertyForClient,
  canUserEditListing
};
