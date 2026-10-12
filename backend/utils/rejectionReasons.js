const { clampString } = require("./sanitize");

/** Codes must match frontend/src/utils/rejectionReasons.js. */
const REJECTION_REASONS = [
  {
    code: "photos",
    label: "Photos missing or poor quality",
    explanation: "The photos are missing, unclear or do not show the actual property. Please add clear, recent photos of the rooms and the building."
  },
  {
    code: "location",
    label: "Location or map pin incorrect",
    explanation: "The map pin or sub-city does not match the property. Please pin the exact location of the building."
  },
  {
    code: "price",
    label: "Price incorrect or unrealistic",
    explanation: "The price looks incorrect or unrealistic for this property. Please check the amount and whether it is per month (rent) or the total price (sale)."
  },
  {
    code: "incomplete",
    label: "Details incomplete or unclear",
    explanation: "Important details such as size, rooms or the description are missing or unclear. Please complete them so buyers and tenants know what to expect."
  },
  {
    code: "duplicate",
    label: "Duplicate listing",
    explanation: "This property is already listed on Market Mizan, so we did not publish it a second time."
  },
  {
    code: "unavailable",
    label: "Property no longer available",
    explanation: "We understood that the property is no longer available, or we could not confirm that it is available."
  },
  {
    code: "unverified",
    label: "Contact or ownership not verified",
    explanation: "We could not reach you or confirm that you are authorised to list this property. Please make sure your phone number and email are correct."
  },
  {
    code: "guidelines",
    label: "Does not meet listing guidelines",
    explanation: "The listing does not meet our listing guidelines (for example, it is not a property in Addis Ababa or contains advertising)."
  },
  {
    code: "other",
    label: "Other",
    explanation: ""
  }
];

/**
 * Turn admin input into the stored reason + the text shown to the submitter.
 * Accepts `{ reasonCode, note }`; a bare legacy `reason` string is treated as "other".
 */
function resolveRejectionReason({ reasonCode, note, reason } = {}) {
  const cleanNote = clampString(note, 1000) || "";
  const legacy = clampString(reason, 500) || "";
  const code = String(reasonCode || (legacy ? "other" : "")).trim();
  const entry = REJECTION_REASONS.find((r) => r.code === code);
  if (!entry) return { ok: false, message: "Please choose a rejection reason." };

  const detail = cleanNote || (entry.code === "other" ? legacy : "");
  if (entry.code === "other" && !detail) {
    return { ok: false, message: "Please write the reason when choosing “Other”." };
  }

  return {
    ok: true,
    code: entry.code,
    label: entry.code === "other" ? "Other" : entry.label,
    explanation: entry.code === "other" ? detail : entry.explanation,
    note: entry.code === "other" ? "" : detail,
    stored: clampString(detail ? `${entry.label}: ${detail}` : entry.label, 500)
  };
}

module.exports = { REJECTION_REASONS, resolveRejectionReason };
