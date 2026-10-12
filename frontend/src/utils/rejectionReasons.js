/** Codes must match backend/utils/rejectionReasons.js (the backend owns the email wording). */
export const REJECTION_REASONS = [
  { code: "photos", label: "Photos missing or poor quality" },
  { code: "location", label: "Location or map pin incorrect" },
  { code: "price", label: "Price incorrect or unrealistic" },
  { code: "incomplete", label: "Details incomplete or unclear" },
  { code: "duplicate", label: "Duplicate listing" },
  { code: "unavailable", label: "Property no longer available" },
  { code: "unverified", label: "Contact or ownership not verified" },
  { code: "guidelines", label: "Does not meet listing guidelines" },
  { code: "other", label: "Other (write the reason)" }
];
