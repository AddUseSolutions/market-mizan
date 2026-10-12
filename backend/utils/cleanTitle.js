const LOCATION_PATTERN = /\baddis\s*abeba\b|\baddis\s*ababa\b|\bethiopia\b/gi;

function cleanTitle(title) {
  if (title == null) return "";

  let s = String(title)
    // Scraped slugs glue the city onto the area ("Ayataddis Ababa", "160 Sqmaddis Ababa").
    .replace(/([a-z])addis\s*ab[ae]ba\b/gi, "$1")
    // Source-site agent codes appended to titles ("…Sunrise_Geo", "…Ayat Hbr", "…Summit _Geo 2").
    .replace(/[\s_]+(?:geo|nig|hbr|leu)(?:\s+\d)?\s*$/i, "")
    // Duplicate-slug counters ("…For Rent 2").
    .replace(/(\bfor\s+(?:rent|sale))\s+\d\s*$/i, "$1")
    .replace(LOCATION_PATTERN, " ");
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

module.exports = { cleanTitle };
