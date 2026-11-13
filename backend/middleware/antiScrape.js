/**
 * Soft anti-scrape layer for public listing APIs.
 * Not a substitute for Cloudflare — slows bulk bots and blocks obvious scrapers.
 */

const BLOCKED_UA =
  /(?:^|[^a-z])(?:scrapy|curl\/|wget|python-requests|python-urllib|aiohttp|httpx\/|libwww-perl|Go-http-client|Java\/|php\/|mechanize|httpclient|okhttp|postmanruntime|insomnia|paw\/|restsharp)/i;

function looksLikeBrowser(ua) {
  if (!ua || ua.length < 20) return false;
  if (BLOCKED_UA.test(ua)) return false;
  // Real browsers almost always advertise Mozilla/ or a known engine.
  return /mozilla\/|chrome\/|safari\/|firefox\/|edg\/|opr\//i.test(ua);
}

/** Apply to bulk listing / map dump routes. */
function antiScrapeListings(req, res, next) {
  const ua = String(req.get("user-agent") || "");
  if (!looksLikeBrowser(ua)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  // Discourage indexing/mirroring of raw JSON dumps.
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("Cache-Control", "private, max-age=30");
  next();
}

module.exports = { antiScrapeListings, looksLikeBrowser };
