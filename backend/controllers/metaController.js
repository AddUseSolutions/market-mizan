const { query, dialect } = require("../db/connection");
const { CANONICAL_AREAS } = require("../utils/canonicalAreas");
const { getPriceHistogram } = require("../utils/priceHistogram");
const { getEtbPerUsd, getFxStatus, refreshEtbPerUsdFromNbe } = require("../utils/fxRate");
const { usdEstimateSql, publicCatalogWhereSql } = require("../utils/listingFilters");
const { getCached } = require("../utils/memoryCache");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

const FILTER_OPTIONS_TTL_MS = 10 * 60 * 1000;

async function getFilterOptions(req, res, next) {
  try {
    const payload = await getCached("filter-options", FILTER_OPTIONS_TTL_MS, async () => {
      // Areas come from the fixed canonical list — skip a wasted DISTINCT scan.
      const [[cities], [types], [statuses], [priceUsdLegacy], [priceEtb], [priceUsd]] = await Promise.all([
        query(
          `SELECT DISTINCT TRIM(location_city) AS c
           FROM properties
           WHERE is_active = TRUE
             AND location_city IS NOT NULL
             AND TRIM(location_city) <> ''
           ORDER BY c`
        ),
        query(
          "SELECT DISTINCT property_type FROM properties WHERE is_active = TRUE AND property_type IS NOT NULL ORDER BY property_type"
        ),
        query(
          "SELECT DISTINCT property_status FROM properties WHERE is_active = TRUE AND property_status IS NOT NULL ORDER BY property_status"
        ),
        query(
          "SELECT MIN(price) as min_price, MAX(price) as max_price FROM properties WHERE is_active = TRUE"
        ),
        query(
          "SELECT MIN(COALESCE(price_etb, price)) as min_price, MAX(COALESCE(price_etb, price)) as max_price FROM properties WHERE is_active = TRUE"
        ),
        query(
          `SELECT MIN(${usdEstimateSql(getEtbPerUsd())}) as min_price, MAX(${usdEstimateSql(getEtbPerUsd())}) as max_price FROM properties WHERE is_active = TRUE`
        )
      ]);
      return {
        cities: cities.map((c) => c.c).filter(Boolean),
        areas: CANONICAL_AREAS,
        property_types: types.map((t) => t.property_type),
        property_statuses: statuses.map((s) => s.property_status).filter(Boolean),
        price_range: priceUsdLegacy[0],
        price_range_etb: priceEtb[0],
        price_range_usd: priceUsd[0]
      };
    });
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

async function getSources(req, res, next) {
  try {
    const [rows] = await query("SELECT * FROM sources ORDER BY created_at DESC");
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const [[active]] = await query("SELECT COUNT(*) as total_active FROM properties WHERE is_active = TRUE");
    const [[catalog]] = await query(
      `SELECT COUNT(*) as total_public FROM properties WHERE ${publicCatalogWhereSql(dialect)}`
    );
    const [[sources]] = await query("SELECT COUNT(*) as total_sources FROM sources WHERE is_active = TRUE");
    const [[lastLog]] = await query("SELECT finished_at FROM scrape_logs WHERE status='success' ORDER BY finished_at DESC LIMIT 1");
    const newTodaySql =
      dialect === "postgres"
        ? "SELECT COUNT(*) as new_today FROM properties WHERE is_active = TRUE AND (first_seen::date) = CURRENT_DATE"
        : "SELECT COUNT(*) as new_today FROM properties WHERE is_active = TRUE AND DATE(first_seen) = CURDATE()";
    const [[today]] = await query(newTodaySql);

    res.json({
      total_active: Number(catalog.total_public) || 0,
      total_in_database: Number(active.total_active) || 0,
      total_sources: sources.total_sources,
      last_scraped: lastLog?.finished_at || null,
      new_today: today.new_today
    });
  } catch (error) {
    next(error);
  }
}

async function getScrapeLogs(req, res, next) {
  try {
    const [rows] = await query("SELECT * FROM scrape_logs ORDER BY id DESC LIMIT 10");
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function runScraperNow(req, res, next) {
  try {
    const ALLOWED_SOURCES = new Set([
      "justproperty",
      "realethio",
      "ethiopiarealty",
      "expat",
      "hoblen",
      "addislist"
    ]);
    const envSource = String(process.env.SCRAPER_SOURCE || "off").trim().toLowerCase() || "off";
    const requested = String(req.body?.source || req.query?.source || "").trim().toLowerCase();
    // Admin may force a single allowlisted source even when SCRAPER_SOURCE=off
    // (Hoblen runs in-process; other sources need the Python scripts on the box).
    const source = requested || envSource;

    if (source === "hoblen") {
      const { importHoblenListings } = require("../utils/importHoblen");
      const limit = Number(req.body?.limit || 80);
      const result = await importHoblenListings({ limit });
      return res.json({
        message: "Hoblen import finished.",
        source: "hoblen",
        ...result
      });
    }

    if (envSource === "off" || envSource === "none" || envSource === "disabled") {
      if (!requested) {
        return res.status(503).json({
          message: "Scraper is disabled (SCRAPER_SOURCE=off). Pass source=hoblen or re-enable SCRAPER_SOURCE.",
          source: envSource
        });
      }
    }

    if (!ALLOWED_SOURCES.has(source)) {
      return res.status(400).json({
        message: "SCRAPER_SOURCE is not an allowlisted value for on-demand runs.",
        source
      });
    }

    const scriptPath = path.join(__dirname, "..", "..", "scraper", "run_scraper.py");
    if (!fs.existsSync(scriptPath)) {
      return res.status(503).json({
        message: "Scraper scripts are not available on this service. Use source=hoblen for the in-process import.",
        source
      });
    }

    const forceRescrape = Boolean(req.body?.forceRescrape);
    const python = process.env.SCRAPER_PYTHON || "python3";
    const skipHours = forceRescrape ? "0" : (process.env.SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS || "336");
    const env = {
      ...process.env,
      SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS: skipHours
    };
    execFile(
      python,
      [scriptPath, "--source", source],
      {
        env,
        cwd: path.join(__dirname, "..", "..", "scraper"),
        timeout: 120_000,
        maxBuffer: 2 * 1024 * 1024
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error("Scraper Fehler:", stderr || error.message);
          return;
        }
        console.log(stdout);
      }
    );
    res.json({
      message: "Scraper wurde gestartet.",
      forceRescrape,
      source,
      skipHours: Number(skipHours)
    });
  } catch (error) {
    next(error);
  }
}

async function getPriceHistogramHandler(req, res, next) {
  try {
    const data = await getPriceHistogram(req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

/** XML sitemap of active listing detail URLs (for Search Console / build scripts). */
async function getPublicSitemap(req, res, next) {
  try {
    const site = String(process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || "https://mmizan.com").replace(
      /\/$/,
      ""
    );
    const [rows] = await query(
      `SELECT property_id, scraped_at, last_seen
       FROM properties
       WHERE is_active = TRUE
         AND title IS NOT NULL AND TRIM(title) <> ''
       ORDER BY last_seen DESC
       LIMIT 5000`
    );
    const escape = (s) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const urls = (rows || [])
      .map((row) => {
        const last = row.scraped_at || row.last_seen;
        const lastmod = last ? new Date(last).toISOString().slice(0, 10) : "";
        return `  <url>
    <loc>${escape(`${site}/property/${encodeURIComponent(row.property_id)}`)}</loc>${
          lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""
        }
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      })
      .join("\n");
    res.type("application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
    );
  } catch (error) {
    next(error);
  }
}

async function getFxRate(req, res, next) {
  try {
    if (String(req.query.refresh || "") === "1") {
      await refreshEtbPerUsdFromNbe().catch(() => null);
    }
    res.json(getFxStatus());
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFilterOptions,
  getSources,
  getStats,
  getScrapeLogs,
  runScraperNow,
  getPriceHistogram: getPriceHistogramHandler,
  getPublicSitemap,
  getFxRate
};
