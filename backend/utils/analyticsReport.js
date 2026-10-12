const { query, dialect } = require("../db/connection");
const { cleanTitle } = require("./cleanTitle");
const { formatListingRef } = require("./listingRef");
const { LEAD_EVENTS } = require("./analyticsStore");

const RANGES = {
  "24h": { ms: 24 * 3600e3, bucket: "hour" },
  "7d": { ms: 7 * 86400e3, bucket: "day" },
  "30d": { ms: 30 * 86400e3, bucket: "day" },
  "90d": { ms: 90 * 86400e3, bucket: "day" }
};
const LIVE_WINDOW_MS = 5 * 60e3;
const ENGAGED_SECONDS = 10;
const MAX_SESSION_SECONDS = 2 * 3600;
const FILTER_KEYS = [
  "search",
  "listing_mode",
  "property_type_group",
  "property_type",
  "area",
  "bedrooms",
  "bathrooms",
  "furnished",
  "price",
  "size",
  "sort",
  "source"
];
const LEAD_LIST = LEAD_EVENTS.map((e) => `'${e}'`).join(", ");

function bucketExpr(column, unit) {
  if (dialect === "postgres") return `date_trunc('${unit}', ${column})`;
  const fmt = { minute: "%Y-%m-%d %H:%i:00", hour: "%Y-%m-%d %H:00:00", day: "%Y-%m-%d 00:00:00" }[unit];
  return `DATE_FORMAT(${column}, '${fmt}')`;
}

function durationExpr() {
  return dialect === "postgres"
    ? "EXTRACT(EPOCH FROM (last_seen - started_at))"
    : "TIMESTAMPDIFF(SECOND, started_at, last_seen)";
}

const truthy = (col) => (dialect === "postgres" ? col : `${col} = 1`);
const num = (v) => Number(v) || 0;
const iso = (v) => (v ? new Date(v).toISOString() : null);

async function rows(sql, params = []) {
  const [result] = await query(sql, params);
  return result || [];
}

function stripQuery(path) {
  const p = String(path || "/");
  const i = p.indexOf("?");
  return (i >= 0 ? p.slice(0, i) : p) || "/";
}

/** Merge rows that share a path once the query string is dropped. */
function mergeByPath(list, key = "path") {
  const map = new Map();
  for (const r of list) {
    const path = stripQuery(r[key]);
    const cur = map.get(path) || { path, views: 0, visitors: 0 };
    cur.views += num(r.views);
    cur.visitors += num(r.visitors);
    map.set(path, cur);
  }
  return [...map.values()].sort((a, b) => b.views - a.views);
}

function filterUsage(paths) {
  const counts = Object.fromEntries(FILTER_KEYS.map((k) => [k, new Map()]));
  for (const raw of paths) {
    const i = String(raw || "").indexOf("?");
    if (i < 0) continue;
    const params = new URLSearchParams(String(raw).slice(i + 1));
    for (const [k, v] of params) {
      if (!v) continue;
      let key = k;
      let value = v;
      if (k === "district") key = "area";
      if (k === "min_price" || k === "max_price") {
        key = "price";
        value = k === "min_price" ? `≥ ${v}` : `≤ ${v}`;
      }
      if (k === "min_size" || k === "max_size") {
        key = "size";
        value = k === "min_size" ? `≥ ${v} m²` : `≤ ${v} m²`;
      }
      if (!counts[key]) continue;
      for (const part of key === "area" || key.startsWith("property_type") ? value.split(",") : [value]) {
        const label = part.trim().slice(0, 60);
        if (!label) continue;
        counts[key].set(label, (counts[key].get(label) || 0) + 1);
      }
    }
  }
  return FILTER_KEYS.map((key) => {
    const values = [...counts[key].entries()].sort((a, b) => b[1] - a[1]);
    return {
      key,
      total: values.reduce((sum, [, n]) => sum + n, 0),
      top: values.slice(0, 8).map(([value, count]) => ({ value, count }))
    };
  }).filter((f) => f.total > 0);
}

async function sessionKpis(from, to) {
  const dur = durationExpr();
  const [r] = await rows(
    `SELECT COUNT(*) AS sessions,
            COUNT(DISTINCT visitor_id) AS visitors,
            COALESCE(SUM(page_views), 0) AS page_views,
            SUM(CASE WHEN ${truthy("has_lead")} THEN 1 ELSE 0 END) AS lead_sessions,
            AVG(CASE WHEN ${dur} > ${MAX_SESSION_SECONDS} THEN ${MAX_SESSION_SECONDS} ELSE ${dur} END) AS avg_duration,
            SUM(CASE WHEN page_views >= 2 OR ${truthy("has_lead")} OR ${dur} >= ${ENGAGED_SECONDS} THEN 1 ELSE 0 END) AS engaged
       FROM analytics_sessions
      WHERE started_at >= ? AND started_at < ?`,
    [from, to]
  );
  const sessions = num(r?.sessions);
  return {
    visitors: num(r?.visitors),
    sessions,
    pageViews: num(r?.page_views),
    pagesPerSession: sessions ? num(r?.page_views) / sessions : 0,
    avgDurationSec: Math.round(num(r?.avg_duration)),
    bounceRate: sessions ? 1 - num(r?.engaged) / sessions : 0,
    leadSessions: num(r?.lead_sessions),
    conversionRate: sessions ? num(r?.lead_sessions) / sessions : 0
  };
}

async function groupSessions(column, since, limit = 10) {
  const list = await rows(
    `SELECT COALESCE(${column}, 'Unknown') AS name, COUNT(*) AS sessions,
            COUNT(DISTINCT visitor_id) AS visitors,
            SUM(CASE WHEN ${truthy("has_lead")} THEN 1 ELSE 0 END) AS leads
       FROM analytics_sessions WHERE started_at >= ?
      GROUP BY COALESCE(${column}, 'Unknown') ORDER BY sessions DESC LIMIT ${Number(limit)}`,
    [since]
  );
  return list.map((r) => ({ name: r.name, sessions: num(r.sessions), visitors: num(r.visitors), leads: num(r.leads) }));
}

async function topListings(since) {
  const list = await rows(
    `SELECT property_id, event, COUNT(*) AS n, COUNT(DISTINCT visitor_id) AS visitors
       FROM analytics_events
      WHERE created_at >= ? AND property_id IS NOT NULL
        AND event IN ('listing_view', 'gallery_open', 'compare_add', 'share_click', ${LEAD_LIST})
      GROUP BY property_id, event`,
    [since]
  );
  const byId = new Map();
  for (const r of list) {
    const cur = byId.get(r.property_id) || { propertyId: r.property_id, views: 0, visitors: 0, whatsapp: 0, phone: 0, email: 0, contact: 0, leads: 0 };
    const n = num(r.n);
    if (r.event === "listing_view") {
      cur.views = n;
      cur.visitors = num(r.visitors);
    }
    if (r.event === "whatsapp_click") cur.whatsapp = n;
    if (r.event === "phone_click") cur.phone = n;
    if (r.event === "email_click") cur.email = n;
    if (r.event === "contact_submit") cur.contact = n;
    if (LEAD_EVENTS.includes(r.event)) cur.leads += n;
    byId.set(r.property_id, cur);
  }
  const top = [...byId.values()].sort((a, b) => b.leads - a.leads || b.views - a.views).slice(0, 15);
  if (!top.length) return [];
  const ids = top.map((t) => t.propertyId);
  const props = await rows(
    `SELECT id, property_id, title, canonical_area, location_area, price_usd, property_status, source_website
       FROM properties WHERE property_id IN (${ids.map(() => "?").join(", ")})`,
    ids
  );
  const meta = new Map(props.map((p) => [String(p.property_id), p]));
  return top.map((t) => {
    const p = meta.get(String(t.propertyId));
    return {
      ...t,
      ref: p ? formatListingRef(p.id) : null,
      title: p ? cleanTitle(p.title) || p.title : null,
      area: p ? p.canonical_area || p.location_area : null,
      priceUsd: p?.price_usd != null ? num(p.price_usd) : null,
      status: p?.property_status || null,
      source: p?.source_website || null
    };
  });
}

async function buildAnalyticsReport(rangeKey = "7d") {
  const range = RANGES[rangeKey] || RANGES["7d"];
  const now = new Date();
  const since = new Date(now.getTime() - range.ms);
  const prevSince = new Date(since.getTime() - range.ms);
  const bucket = bucketExpr("started_at", range.bucket);

  const [
    kpis,
    previous,
    newVisitorsRow,
    series,
    sources,
    campaigns,
    devices,
    browsers,
    os,
    countries,
    languages,
    landing,
    pages,
    eventCounts,
    clicks,
    searches,
    zeroSearches,
    searchPaths,
    funnelRow,
    listings
  ] = await Promise.all([
    sessionKpis(since, now),
    sessionKpis(prevSince, since),
    rows(
      `SELECT COUNT(*) AS n FROM (
         SELECT visitor_id FROM analytics_sessions GROUP BY visitor_id HAVING MIN(started_at) >= ?
       ) first_visits`,
      [since]
    ),
    rows(
      `SELECT ${bucket} AS bucket, COUNT(DISTINCT visitor_id) AS visitors, COUNT(*) AS sessions,
              COALESCE(SUM(page_views), 0) AS page_views,
              SUM(CASE WHEN ${truthy("has_lead")} THEN 1 ELSE 0 END) AS leads
         FROM analytics_sessions WHERE started_at >= ?
        GROUP BY ${bucket} ORDER BY bucket`,
      [since]
    ),
    rows(
      `SELECT COALESCE(source, 'Direct') AS source, COALESCE(medium, 'none') AS medium,
              COUNT(*) AS sessions, COUNT(DISTINCT visitor_id) AS visitors,
              SUM(CASE WHEN ${truthy("has_lead")} THEN 1 ELSE 0 END) AS leads,
              COALESCE(SUM(page_views), 0) AS page_views
         FROM analytics_sessions WHERE started_at >= ?
        GROUP BY COALESCE(source, 'Direct'), COALESCE(medium, 'none')
        ORDER BY sessions DESC LIMIT 15`,
      [since]
    ),
    rows(
      `SELECT source, campaign, COUNT(*) AS sessions,
              SUM(CASE WHEN ${truthy("has_lead")} THEN 1 ELSE 0 END) AS leads
         FROM analytics_sessions WHERE started_at >= ? AND campaign IS NOT NULL
        GROUP BY source, campaign ORDER BY sessions DESC LIMIT 15`,
      [since]
    ),
    groupSessions("device", since),
    groupSessions("browser", since),
    groupSessions("os", since),
    groupSessions("country", since, 12),
    groupSessions("language", since, 8),
    rows(
      `SELECT landing_path AS path, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
         FROM analytics_sessions WHERE started_at >= ?
        GROUP BY landing_path ORDER BY views DESC LIMIT 300`,
      [since]
    ),
    rows(
      `SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
         FROM analytics_events WHERE created_at >= ? AND event = 'page_view'
        GROUP BY path ORDER BY views DESC LIMIT 500`,
      [since]
    ),
    rows(
      `SELECT event, COUNT(*) AS n, COUNT(DISTINCT visitor_id) AS visitors
         FROM analytics_events WHERE created_at >= ? GROUP BY event`,
      [since]
    ),
    rows(
      `SELECT event, label, COUNT(*) AS n, COUNT(DISTINCT visitor_id) AS visitors
         FROM analytics_events
        WHERE created_at >= ? AND event IN ('click', 'outbound_click', 'share_click', 'gallery_open', 'compare_add', ${LEAD_LIST})
          AND label IS NOT NULL
        GROUP BY event, label ORDER BY n DESC LIMIT 30`,
      [since]
    ),
    rows(
      `SELECT label, COUNT(*) AS n, AVG(value) AS avg_results,
              SUM(CASE WHEN value = 0 THEN 1 ELSE 0 END) AS zero
         FROM analytics_events WHERE created_at >= ? AND event = 'search' AND label IS NOT NULL
        GROUP BY label ORDER BY n DESC LIMIT 20`,
      [since]
    ),
    rows(
      `SELECT label, COUNT(*) AS n
         FROM analytics_events WHERE created_at >= ? AND event = 'search' AND value = 0 AND label IS NOT NULL
        GROUP BY label ORDER BY n DESC LIMIT 12`,
      [since]
    ),
    rows(
      `SELECT path FROM analytics_events WHERE created_at >= ? AND event = 'search'
        ORDER BY created_at DESC LIMIT 5000`,
      [since]
    ),
    rows(
      `SELECT COUNT(DISTINCT visitor_id) AS visitors,
              COUNT(DISTINCT CASE WHEN event = 'search' THEN visitor_id END) AS searched,
              COUNT(DISTINCT CASE WHEN event = 'listing_view' THEN visitor_id END) AS viewed_listing,
              COUNT(DISTINCT CASE WHEN event IN (${LEAD_LIST}) THEN visitor_id END) AS contacted
         FROM analytics_events WHERE created_at >= ?`,
      [since]
    ),
    topListings(since)
  ]);

  const events = Object.fromEntries(eventCounts.map((r) => [r.event, { count: num(r.n), visitors: num(r.visitors) }]));
  const newVisitors = Math.min(num(newVisitorsRow[0]?.n), kpis.visitors);

  return {
    range: rangeKey in RANGES ? rangeKey : "7d",
    bucket: range.bucket,
    since: since.toISOString(),
    generatedAt: now.toISOString(),
    kpis: { ...kpis, newVisitors, returningVisitors: Math.max(0, kpis.visitors - newVisitors) },
    previous,
    series: series.map((r) => ({
      t: iso(r.bucket),
      visitors: num(r.visitors),
      sessions: num(r.sessions),
      pageViews: num(r.page_views),
      leads: num(r.leads)
    })),
    sources: sources.map((r) => ({
      source: r.source,
      medium: r.medium,
      sessions: num(r.sessions),
      visitors: num(r.visitors),
      leads: num(r.leads),
      pagesPerSession: num(r.sessions) ? num(r.page_views) / num(r.sessions) : 0
    })),
    campaigns: campaigns.map((r) => ({ source: r.source, campaign: r.campaign, sessions: num(r.sessions), leads: num(r.leads) })),
    tech: { devices, browsers, os, countries, languages },
    landingPages: mergeByPath(landing).slice(0, 12),
    topPages: mergeByPath(pages).slice(0, 15),
    events,
    leads: {
      whatsapp: events.whatsapp_click?.count || 0,
      phone: events.phone_click?.count || 0,
      email: events.email_click?.count || 0,
      contactForm: events.contact_submit?.count || 0,
      listingSubmissions: events.list_property_submit?.count || 0
    },
    clicks: clicks.map((r) => ({ event: r.event, label: r.label, count: num(r.n), visitors: num(r.visitors) })),
    searches: searches.map((r) => ({
      term: r.label,
      count: num(r.n),
      avgResults: Math.round(num(r.avg_results)),
      zeroResults: num(r.zero)
    })),
    zeroResultSearches: zeroSearches.map((r) => ({ term: r.label, count: num(r.n) })),
    filters: filterUsage(searchPaths.map((r) => r.path)),
    funnel: {
      visitors: num(funnelRow[0]?.visitors),
      searched: num(funnelRow[0]?.searched),
      viewedListing: num(funnelRow[0]?.viewed_listing),
      contacted: num(funnelRow[0]?.contacted)
    },
    listings
  };
}

async function buildLiveSnapshot() {
  const now = Date.now();
  const liveSince = new Date(now - LIVE_WINDOW_MS);
  const halfHour = new Date(now - 30 * 60e3);
  const minute = bucketExpr("created_at", "minute");

  const [sessions, perMinute, recent, todayRow] = await Promise.all([
    rows(
      `SELECT session_id, visitor_id, started_at, last_seen, current_path, landing_path, source, medium, campaign,
              device, browser, os, country, page_views, has_lead
         FROM analytics_sessions WHERE last_seen >= ?
        ORDER BY last_seen DESC LIMIT 100`,
      [liveSince]
    ),
    rows(
      `SELECT ${minute} AS bucket, COUNT(DISTINCT session_id) AS sessions
         FROM analytics_events WHERE created_at >= ?
        GROUP BY ${minute} ORDER BY bucket`,
      [halfHour]
    ),
    rows(
      `SELECT e.created_at, e.event, e.path, e.label, e.property_id, s.device, s.country, s.source
         FROM analytics_events e
         LEFT JOIN analytics_sessions s ON s.session_id = e.session_id
        WHERE e.created_at >= ?
        ORDER BY e.created_at DESC LIMIT 40`,
      [halfHour]
    ),
    rows(
      `SELECT COUNT(DISTINCT visitor_id) AS visitors, COUNT(*) AS sessions
         FROM analytics_sessions WHERE started_at >= ?`,
      [new Date(now - 24 * 3600e3)]
    )
  ]);

  const pageCounts = new Map();
  for (const s of sessions) {
    const path = stripQuery(s.current_path);
    pageCounts.set(path, (pageCounts.get(path) || 0) + 1);
  }

  return {
    generatedAt: new Date(now).toISOString(),
    activeVisitors: new Set(sessions.map((s) => s.visitor_id)).size,
    activeSessions: sessions.length,
    last24h: { visitors: num(todayRow[0]?.visitors), sessions: num(todayRow[0]?.sessions) },
    activePages: [...pageCounts.entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    sessions: sessions.map((s) => ({
      id: String(s.session_id).slice(0, 8),
      visitor: String(s.visitor_id).slice(0, 6),
      startedAt: iso(s.started_at),
      lastSeen: iso(s.last_seen),
      currentPath: s.current_path,
      landingPath: s.landing_path,
      source: s.source,
      campaign: s.campaign,
      device: s.device,
      browser: s.browser,
      os: s.os,
      country: s.country,
      pageViews: num(s.page_views),
      hasLead: Boolean(s.has_lead)
    })),
    perMinute: perMinute.map((r) => ({ t: iso(r.bucket), sessions: num(r.sessions) })),
    recent: recent.map((r) => ({
      at: iso(r.created_at),
      event: r.event,
      path: r.path,
      label: r.label,
      propertyId: r.property_id,
      device: r.device,
      country: r.country,
      source: r.source
    }))
  };
}

module.exports = { RANGES, buildAnalyticsReport, buildLiveSnapshot, filterUsage, mergeByPath };
