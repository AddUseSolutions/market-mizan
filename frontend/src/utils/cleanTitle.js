const LOCATION_PATTERN = /\baddis\s*abeba\b|\baddis\s*ababa\b|\bethiopia\b/gi;

export function cleanTitle(title) {
  if (title == null) return "";

  let s = String(title).replace(LOCATION_PATTERN, " ");
  s = s.replace(/,\s*,+/g, ",");
  s = s.replace(/,\s*$/g, "");
  s = s.replace(/^\s*,\s*/g, "");
  s = s.replace(/\s{2,}/g, " ");
  s = s.replace(/\s+,/g, ",");
  s = s.replace(/,\s+/g, ", ");
  s = s.replace(/\s+in\s*$/i, "");
  s = s.replace(/\s+at\s*$/i, "");

  return s.trim();
}
