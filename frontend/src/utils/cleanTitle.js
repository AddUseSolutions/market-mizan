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

  return trimDisplayText(s);
}

export function trimDisplayText(text) {
  if (text == null) return "";
  return String(text).replace(/[,.\s]+$/, "").trim();
}

export function isLocationNoise(part) {
  if (!part) return true;
  const probe = String(part).trim();
  if (!probe) return true;
  return /\baddis\s*abeba\b|\baddis\s*ababa\b|\bethiopia\b/i.test(probe);
}

export function locationKickerParts({ district, area } = {}) {
  const parts = [];
  const d = trimDisplayText(district);
  const a = trimDisplayText(area);
  const districtLower = d.toLowerCase();

  if (d && !isLocationNoise(d)) parts.push(d);
  if (a && !districtLower.includes(a.toLowerCase()) && !isLocationNoise(a)) parts.push(a);

  return parts;
}
