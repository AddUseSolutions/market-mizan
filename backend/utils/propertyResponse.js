const { normalizeRole } = require("../constants/roles");
const { cleanTitle } = require("./cleanTitle");

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

/**
 * RBAC: only ADMIN receives description_summary in API responses.
 * All clients receive the original text via `description` (and description_original).
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

  if (isAdmin) {
    out.description_summary = summary;
  } else {
    delete out.description_summary;
  }

  return out;
}

module.exports = {
  resolveDescriptionOriginal,
  resolveDescriptionSummary,
  sanitizePropertyForClient
};
