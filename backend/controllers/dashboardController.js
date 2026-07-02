const { query, dialect } = require("../db/connection");
const { getEtbPerUsd } = require("../utils/fxRate");
const { fetchNeighborhoodStats, groupNeighborhoodStats } = require("../utils/hmlo");
const { normalizeRole, isAdmin, ROLES } = require("../constants/roles");
const { getCached } = require("../utils/memoryCache");

const CACHE_KEY = "dashboard-stats-full";
const CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchInventoryStats() {
  if (dialect === "postgres") {
    const [[row]] = await query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active,
        COUNT(*) FILTER (WHERE is_active = FALSE)::int AS inactive,
        COUNT(*) FILTER (WHERE is_active = TRUE AND listing_origin = 'crawled')::int AS crawled,
        COUNT(*) FILTER (WHERE is_active = TRUE AND listing_origin = 'verified')::int AS verified,
        COUNT(*) FILTER (WHERE is_active = TRUE AND LOWER(COALESCE(property_status, '')) LIKE '%rent%')::int AS rent,
        COUNT(*) FILTER (WHERE is_active = TRUE AND LOWER(COALESCE(property_status, '')) LIKE '%sale%')::int AS sale
      FROM properties
    `);
    return {
      total: row.total,
      active: row.active,
      inactive: row.inactive,
      crawled: row.crawled,
      verified: row.verified,
      rent: row.rent,
      sale: row.sale
    };
  }

  const [[row]] = await query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive,
      SUM(CASE WHEN is_active = TRUE AND listing_origin = 'crawled' THEN 1 ELSE 0 END) AS crawled,
      SUM(CASE WHEN is_active = TRUE AND listing_origin = 'verified' THEN 1 ELSE 0 END) AS verified,
      SUM(CASE WHEN is_active = TRUE AND LOWER(COALESCE(property_status, '')) LIKE '%rent%' THEN 1 ELSE 0 END) AS rent,
      SUM(CASE WHEN is_active = TRUE AND LOWER(COALESCE(property_status, '')) LIKE '%sale%' THEN 1 ELSE 0 END) AS sale
    FROM properties
  `);
  return {
    total: Number(row.total) || 0,
    active: Number(row.active) || 0,
    inactive: Number(row.inactive) || 0,
    crawled: Number(row.crawled) || 0,
    verified: Number(row.verified) || 0,
    rent: Number(row.rent) || 0,
    sale: Number(row.sale) || 0
  };
}

async function fetchScraperStats() {
  const [logs] = await query(
    "SELECT * FROM scrape_logs ORDER BY id DESC LIMIT 5"
  );
  const lastRun = logs[0] || null;

  let errorsInLastRun = 0;
  if (lastRun) {
    if (lastRun.error_message || String(lastRun.status || "").toLowerCase() !== "success") {
      errorsInLastRun += 1;
    }
    if (lastRun.started_at) {
      try {
        const errSql =
          dialect === "postgres"
            ? `SELECT COUNT(*)::int AS c FROM properties
               WHERE last_scrape_error_at IS NOT NULL
                 AND last_scrape_error_at >= ?
                 AND last_scrape_error_at <= COALESCE(?, NOW())`
            : `SELECT COUNT(*) AS c FROM properties
               WHERE last_scrape_error_at IS NOT NULL
                 AND last_scrape_error_at >= ?
                 AND last_scrape_error_at <= COALESCE(?, NOW())`;
        const [[errRow]] = await query(errSql, [lastRun.started_at, lastRun.finished_at]);
        errorsInLastRun = Math.max(errorsInLastRun, Number(errRow?.c || 0));
      } catch {
        /* column may be absent on older DBs */
      }
    }
  }

  const [[urlRow]] = await query(
    `SELECT COUNT(DISTINCT detail_url_normalized) AS sync_urls
     FROM properties
     WHERE is_active = TRUE
       AND detail_url_normalized IS NOT NULL
       AND TRIM(detail_url_normalized) <> ''`
  );

  return {
    lastRun,
    recentLogs: logs,
    errorsInLastRun,
    syncUrlCount: Number(urlRow?.sync_urls || 0)
  };
}

async function fetchModerationStats() {
  const imageCountSql =
    dialect === "postgres"
      ? `CASE WHEN images IS NULL THEN 0 ELSE COALESCE(jsonb_array_length(images::jsonb), 0) END`
      : `CASE WHEN images IS NULL THEN 0 ELSE COALESCE(JSON_LENGTH(images), 0) END`;

  const [[pendingRow]] = await query(
    "SELECT COUNT(*) AS c FROM listing_submissions WHERE status = 'pending'"
  );
  const [[flagsRow]] = await query("SELECT COUNT(*) AS c FROM listing_crowd_flags");
  const [pendingSubmissions] = await query(
    `SELECT id, title, property_type, property_category, listing_mode, price, price_etb, price_usd,
            size_m2, land_area_m2, rooms, bedrooms, bathrooms, kitchens, living_rooms,
            maid_bedrooms, maid_bathrooms, location_area, location_city, available_from,
            contact_name, contact_email, contact_phone, latitude, longitude, notes,
            description_original, description_summary, ai_description, ai_title_suggestion, created_at,
            ${imageCountSql} AS image_count
     FROM listing_submissions
     WHERE status = 'pending'
     ORDER BY created_at DESC
     LIMIT 20`
  );

  return {
    pendingSubmissions: Number(pendingRow?.c || 0),
    crowdFlags: Number(flagsRow?.c || 0),
    submissions: pendingSubmissions
  };
}

async function fetchMarketStats() {
  const [hmloRows] = await query(
    `SELECT hmlo_score, COUNT(*) AS count
     FROM properties
     WHERE is_active = TRUE AND hmlo_score IS NOT NULL
     GROUP BY hmlo_score`
  );
  const distribution = {};
  let opportunities = 0;
  for (const r of hmloRows) {
    const key = String(r.hmlo_score || "").toLowerCase();
    const count = Number(r.count) || 0;
    distribution[key] = count;
    if (key === "opportunity") opportunities = count;
  }

  const neighborhoodRows = await fetchNeighborhoodStats(query, dialect);
  const neighborhoods = groupNeighborhoodStats(neighborhoodRows, { limitPerType: 12 });

  return {
    opportunities,
    hmloDistribution: distribution,
    fxRateEtbPerUsd: getEtbPerUsd(),
    neighborhoods
  };
}

async function fetchHolisticLeads() {
  const [rows] = await query(
    `SELECT id, lead_type, service_label, first_name, last_name, email, phone, message,
            property_id, property_title, property_address, status, created_at
     FROM holistic_leads
     ORDER BY created_at DESC
     LIMIT 10`
  );
  return rows;
}

async function fetchFullDashboardStats() {
  const [inventory, scraper, moderation, market, leads] = await Promise.all([
    fetchInventoryStats(),
    fetchScraperStats(),
    fetchModerationStats(),
    fetchMarketStats(),
    fetchHolisticLeads()
  ]);

  return {
    cachedAt: new Date().toISOString(),
    inventory,
    scraper,
    moderation,
    market,
    leads
  };
}

async function filterLeadsForBroker(leads, userId) {
  if (!leads?.length) return [];
  const [owned] = await query(
    "SELECT property_id FROM properties WHERE owner_id = ? AND is_active = TRUE",
    [userId]
  );
  const ownedIds = new Set(owned.map((r) => r.property_id));
  return leads.filter((l) => l.property_id && ownedIds.has(l.property_id));
}

function filterDashboardForRole(full, user) {
  const role = normalizeRole(user?.role);
  const base = { role, cachedAt: full.cachedAt };

  if (isAdmin(role)) {
    return full;
  }

  if (role === ROLES.AGENCY_BROKER) {
    return {
      ...base,
      leads: full.leads
    };
  }

  if (role === ROLES.PREMIUM_BUYER) {
    return {
      ...base,
      market: full.market
    };
  }

  return base;
}

async function getDashboardStats(req, res, next) {
  try {
    const full = await getCached(CACHE_KEY, CACHE_TTL_MS, fetchFullDashboardStats);
    const role = normalizeRole(req.user?.role);

    let payload = { ...full };
    if (role === ROLES.AGENCY_BROKER && !isAdmin(role)) {
      payload.leads = await filterLeadsForBroker(full.leads, req.user.id);
    }

    res.json(filterDashboardForRole(payload, req.user));
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboardStats, fetchFullDashboardStats };
