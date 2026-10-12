/**
 * First-party, cookie-less site analytics.
 * Visitors are identified by a random id the browser keeps in localStorage; no IP addresses
 * or personal data are stored. Sessions live in analytics_sessions (one row per visit,
 * kept fresh by heartbeats for the live view); meaningful events go to analytics_events.
 */
const { query, dialect } = require("../db/connection");

const EVENT_NAMES = new Set([
  "page_view",
  "click",
  "listing_view",
  "whatsapp_click",
  "phone_click",
  "email_click",
  "contact_submit",
  "outbound_click",
  "search",
  "compare_add",
  "share_click",
  "gallery_open",
  "list_property_start",
  "list_property_submit"
]);
const LEAD_EVENTS = ["whatsapp_click", "phone_click", "email_click", "contact_submit"];
const RETENTION_DAYS = 400;
const BOT_UA_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|python|curl|wget|axios|node-fetch/i;
const ID_RE = /^[a-z0-9-]{8,40}$/i;

const TZ_COUNTRY = {
  "Africa/Addis_Ababa": "Ethiopia",
  "Africa/Nairobi": "Kenya",
  "Africa/Kampala": "Uganda",
  "Africa/Dar_es_Salaam": "Tanzania",
  "Africa/Djibouti": "Djibouti",
  "Africa/Mogadishu": "Somalia",
  "Africa/Asmara": "Eritrea",
  "Africa/Khartoum": "Sudan",
  "Africa/Cairo": "Egypt",
  "Africa/Lagos": "Nigeria",
  "Africa/Johannesburg": "South Africa",
  "Asia/Dubai": "United Arab Emirates",
  "Asia/Riyadh": "Saudi Arabia",
  "Asia/Qatar": "Qatar",
  "Asia/Kuwait": "Kuwait",
  "Asia/Bahrain": "Bahrain",
  "Asia/Jerusalem": "Israel",
  "Asia/Beirut": "Lebanon",
  "Asia/Istanbul": "Turkey",
  "Europe/Istanbul": "Turkey",
  "Asia/Kolkata": "India",
  "Asia/Shanghai": "China",
  "Asia/Tokyo": "Japan",
  "Asia/Singapore": "Singapore",
  "Europe/Zurich": "Switzerland",
  "Europe/Berlin": "Germany",
  "Europe/Vienna": "Austria",
  "Europe/London": "United Kingdom",
  "Europe/Paris": "France",
  "Europe/Rome": "Italy",
  "Europe/Madrid": "Spain",
  "Europe/Amsterdam": "Netherlands",
  "Europe/Brussels": "Belgium",
  "Europe/Stockholm": "Sweden",
  "Europe/Oslo": "Norway",
  "Europe/Copenhagen": "Denmark",
  "Europe/Helsinki": "Finland",
  "Europe/Dublin": "Ireland",
  "Europe/Moscow": "Russia",
  "Australia/Sydney": "Australia",
  "Australia/Melbourne": "Australia",
  "America/Toronto": "Canada",
  "America/Vancouver": "Canada",
  "America/Sao_Paulo": "Brazil"
};

function countryFromTimezone(tz) {
  const zone = String(tz || "").trim();
  if (!zone) return null;
  if (TZ_COUNTRY[zone]) return TZ_COUNTRY[zone];
  if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Detroit|Anchorage|Indiana|Kentucky|Boise)/.test(zone) || zone.startsWith("US/")) {
    return "United States";
  }
  return null;
}

function parseUserAgent(ua) {
  const s = String(ua || "");
  const device = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(s)
    ? "tablet"
    : /Mobi|iPhone|iPod|Android.*Mobile|Opera Mini|IEMobile/i.test(s)
      ? "mobile"
      : "desktop";
  let browser = "Other";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/.test(s)) browser = "Opera";
  else if (/SamsungBrowser/.test(s)) browser = "Samsung Internet";
  else if (/FBAN|FBAV|Instagram/.test(s)) browser = "In-app (Facebook/Instagram)";
  else if (/CriOS|Chrome\//.test(s)) browser = "Chrome";
  else if (/FxiOS|Firefox\//.test(s)) browser = "Firefox";
  else if (/Safari\//.test(s)) browser = "Safari";
  let os = "Other";
  if (/Android/.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(s)) os = "iOS";
  else if (/Windows/.test(s)) os = "Windows";
  else if (/Mac OS X|Macintosh/.test(s)) os = "macOS";
  else if (/CrOS/.test(s)) os = "ChromeOS";
  else if (/Linux/.test(s)) os = "Linux";
  return { device, browser, os };
}

function isBot(ua) {
  return !ua || BOT_UA_RE.test(String(ua));
}

const SEARCH_HOSTS = [
  [/(^|\.)google\./, "Google Search"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)yahoo\./, "Yahoo"],
  [/(^|\.)yandex\./, "Yandex"]
];
const SOCIAL_HOSTS = [
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|m\.facebook\.com|l\.facebook\.com|lm\.facebook\.com)$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "X / Twitter"],
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)(t\.me|telegram\.org|telegram\.me)$/, "Telegram"],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, "WhatsApp"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)youtube\.com$/, "YouTube"]
];

function clamp(value, max) {
  if (value == null) return null;
  const s = String(value).replace(/[\u0000-\u001f]/g, " ").trim();
  return s ? s.slice(0, max) : null;
}

function toCount(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1e9, Math.round(n))) : null;
}

function hostOf(url) {
  try {
    return new URL(String(url)).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Attribute a visit: Google Ads (gclid / cpc), UTM-tagged campaigns, search, social, other referrers, direct. */
function classifySource({ utm = {}, gclid = false, referrer = null, ownHosts = [] } = {}) {
  const utmSource = clamp(utm.source, 60);
  const utmMedium = clamp(utm.medium, 60);
  const utmCampaign = clamp(utm.campaign, 120);
  const refHost = hostOf(referrer);
  const internal = refHost && ownHosts.some((h) => refHost === h || refHost.endsWith(`.${h}`));

  if (gclid || (/google/i.test(utmSource || "") && /cpc|ppc|paid|ads/i.test(utmMedium || ""))) {
    return { source: "Google Ads", medium: utmMedium || "cpc", campaign: utmCampaign, referrerHost: internal ? null : refHost };
  }
  if (utmSource) {
    return { source: utmSource, medium: utmMedium || "campaign", campaign: utmCampaign, referrerHost: internal ? null : refHost };
  }
  if (refHost && !internal) {
    const search = SEARCH_HOSTS.find(([re]) => re.test(refHost));
    if (search) return { source: search[1], medium: "organic", campaign: null, referrerHost: refHost };
    const social = SOCIAL_HOSTS.find(([re]) => re.test(refHost));
    if (social) return { source: social[1], medium: "social", campaign: null, referrerHost: refHost };
    return { source: refHost, medium: "referral", campaign: null, referrerHost: refHost };
  }
  return { source: "Direct", medium: "none", campaign: null, referrerHost: null };
}

async function ensureAnalyticsSchema() {
  if (dialect === "postgres") {
    await query(`
      CREATE TABLE IF NOT EXISTS analytics_sessions (
        session_id VARCHAR(40) PRIMARY KEY,
        visitor_id VARCHAR(40) NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        landing_path VARCHAR(300),
        current_path VARCHAR(300),
        source VARCHAR(80),
        medium VARCHAR(60),
        campaign VARCHAR(120),
        referrer_host VARCHAR(120),
        device VARCHAR(10),
        browser VARCHAR(40),
        os VARCHAR(20),
        country VARCHAR(60),
        language VARCHAR(12),
        page_views INT NOT NULL DEFAULT 0,
        events INT NOT NULL DEFAULT 0,
        has_lead BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        session_id VARCHAR(40) NOT NULL,
        visitor_id VARCHAR(40) NOT NULL,
        event VARCHAR(30) NOT NULL,
        path VARCHAR(300),
        label VARCHAR(160),
        property_id VARCHAR(80),
        value INT
      )
    `);
    await query("CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started ON analytics_sessions (started_at)");
    await query("CREATE INDEX IF NOT EXISTS idx_analytics_sessions_last_seen ON analytics_sessions (last_seen)");
    await query("CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events (created_at)");
    await query("CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created ON analytics_events (event, created_at)");
    return;
  }
  await query(`
    CREATE TABLE IF NOT EXISTS analytics_sessions (
      session_id VARCHAR(40) PRIMARY KEY,
      visitor_id VARCHAR(40) NOT NULL,
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      landing_path VARCHAR(300), current_path VARCHAR(300),
      source VARCHAR(80), medium VARCHAR(60), campaign VARCHAR(120), referrer_host VARCHAR(120),
      device VARCHAR(10), browser VARCHAR(40), os VARCHAR(20), country VARCHAR(60), language VARCHAR(12),
      page_views INT NOT NULL DEFAULT 0, events INT NOT NULL DEFAULT 0, has_lead TINYINT(1) NOT NULL DEFAULT 0,
      KEY idx_analytics_sessions_started (started_at), KEY idx_analytics_sessions_last_seen (last_seen)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      session_id VARCHAR(40) NOT NULL, visitor_id VARCHAR(40) NOT NULL,
      event VARCHAR(30) NOT NULL, path VARCHAR(300), label VARCHAR(160), property_id VARCHAR(80), value INT,
      KEY idx_analytics_events_created (created_at), KEY idx_analytics_events_event_created (event, created_at)
    )
  `);
}

/**
 * Validate one beacon payload from the browser.
 * Returns null when the payload is unusable (missing ids, bot, nothing to record).
 */
function normalizeBatch(body, userAgent, { ownHosts = [] } = {}) {
  if (!body || typeof body !== "object" || isBot(userAgent)) return null;
  const visitorId = String(body.vid || "");
  const sessionId = String(body.sid || "");
  if (!ID_RE.test(visitorId) || !ID_RE.test(sessionId)) return null;

  const rawEvents = Array.isArray(body.events) ? body.events.slice(0, 40) : [];
  const events = [];
  for (const e of rawEvents) {
    const name = String(e?.e || "");
    if (!EVENT_NAMES.has(name)) continue;
    events.push({
      event: name,
      path: clamp(e.p, 300),
      label: clamp(e.l, 160),
      propertyId: clamp(e.pid, 80),
      value: toCount(e.v)
    });
  }

  const attribution = classifySource({
    utm: body.utm && typeof body.utm === "object" ? body.utm : {},
    gclid: Boolean(body.gclid),
    referrer: body.ref,
    ownHosts
  });
  const { device, browser, os } = parseUserAgent(userAgent);
  const pageViews = events.filter((e) => e.event === "page_view");
  return {
    visitorId,
    sessionId,
    events,
    session: {
      ...attribution,
      device,
      browser,
      os,
      country: countryFromTimezone(body.tz),
      language: clamp(body.lang, 12),
      landingPath: pageViews[0]?.path || clamp(body.path, 300),
      currentPath: pageViews[pageViews.length - 1]?.path || clamp(body.path, 300),
      pageViews: pageViews.length,
      eventCount: events.length,
      hasLead: events.some((e) => LEAD_EVENTS.includes(e.event))
    }
  };
}

async function recordBatch(batch) {
  const { visitorId, sessionId, events, session: s } = batch;
  const insertCols = `(session_id, visitor_id, landing_path, current_path, source, medium, campaign, referrer_host,
    device, browser, os, country, language, page_views, events, has_lead)`;
  const params = [
    sessionId, visitorId, s.landingPath, s.currentPath, s.source, s.medium, s.campaign, s.referrerHost,
    s.device, s.browser, s.os, s.country, s.language, s.pageViews, s.eventCount, s.hasLead
  ];
  const values = "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  if (dialect === "postgres") {
    await query(
      `INSERT INTO analytics_sessions ${insertCols} VALUES ${values}
       ON CONFLICT (session_id) DO UPDATE SET
         last_seen = NOW(),
         current_path = COALESCE(EXCLUDED.current_path, analytics_sessions.current_path),
         page_views = analytics_sessions.page_views + EXCLUDED.page_views,
         events = analytics_sessions.events + EXCLUDED.events,
         has_lead = analytics_sessions.has_lead OR EXCLUDED.has_lead`,
      params
    );
  } else {
    await query(
      `INSERT INTO analytics_sessions ${insertCols} VALUES ${values}
       ON DUPLICATE KEY UPDATE
         last_seen = NOW(),
         current_path = COALESCE(VALUES(current_path), current_path),
         page_views = page_views + VALUES(page_views),
         events = events + VALUES(events),
         has_lead = has_lead OR VALUES(has_lead)`,
      params
    );
  }

  if (!events.length) return;
  const rows = events.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
  const eventParams = events.flatMap((e) => [sessionId, visitorId, e.event, e.path, e.label, e.propertyId, e.value]);
  await query(
    `INSERT INTO analytics_events (session_id, visitor_id, event, path, label, property_id, value) VALUES ${rows}`,
    eventParams
  );
}

async function purgeOldAnalytics() {
  const cutoff =
    dialect === "postgres" ? `NOW() - INTERVAL '${RETENTION_DAYS} days'` : `NOW() - INTERVAL ${RETENTION_DAYS} DAY`;
  await query(`DELETE FROM analytics_events WHERE created_at < ${cutoff}`);
  await query(`DELETE FROM analytics_sessions WHERE last_seen < ${cutoff}`);
}

module.exports = {
  EVENT_NAMES,
  LEAD_EVENTS,
  ensureAnalyticsSchema,
  normalizeBatch,
  recordBatch,
  purgeOldAnalytics,
  classifySource,
  parseUserAgent,
  countryFromTimezone,
  isBot
};
