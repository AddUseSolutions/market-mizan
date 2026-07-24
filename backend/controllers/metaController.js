const { query, dialect } = require("../db/connection");
const { CANONICAL_AREAS } = require("../utils/canonicalAreas");
const { getPriceHistogram } = require("../utils/priceHistogram");
const { exec } = require("child_process");
const path = require("path");

async function getFilterOptions(req, res, next) {
  try {
    // Nur DB-Feld location_area — wie „Area:“ auf der Detailseite, ohne Adress-Teile.
    const [cities] = await query(
      `SELECT DISTINCT TRIM(location_city) AS c
       FROM properties
       WHERE is_active = TRUE
         AND location_city IS NOT NULL
         AND TRIM(location_city) <> ''
       ORDER BY c`
    );
    const [areas] = await query(
      `SELECT DISTINCT TRIM(location_area) AS la
       FROM properties
       WHERE is_active = TRUE
         AND location_area IS NOT NULL
         AND TRIM(location_area) <> ''
       ORDER BY la`
    );
    const [types] = await query(
      "SELECT DISTINCT property_type FROM properties WHERE is_active = TRUE AND property_type IS NOT NULL ORDER BY property_type"
    );
    const [statuses] = await query(
      "SELECT DISTINCT property_status FROM properties WHERE is_active = TRUE AND property_status IS NOT NULL ORDER BY property_status"
    );
    const [priceUsdLegacy] = await query(
      "SELECT MIN(price) as min_price, MAX(price) as max_price FROM properties WHERE is_active = TRUE"
    );
    const [priceEtb] = await query(
      "SELECT MIN(COALESCE(price_etb, price)) as min_price, MAX(COALESCE(price_etb, price)) as max_price FROM properties WHERE is_active = TRUE"
    );
    const [priceUsd] = await query(
      "SELECT MIN(COALESCE(price_usd, price)) as min_price, MAX(COALESCE(price_usd, price)) as max_price FROM properties WHERE is_active = TRUE"
    );
    res.json({
      cities: cities.map((c) => c.c).filter(Boolean),
      areas: CANONICAL_AREAS,
      property_types: types.map((t) => t.property_type),
      property_statuses: statuses.map((s) => s.property_status).filter(Boolean),
      price_range: priceUsdLegacy[0],
      price_range_etb: priceEtb[0],
      price_range_usd: priceUsd[0]
    });
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
    const [[sources]] = await query("SELECT COUNT(*) as total_sources FROM sources WHERE is_active = TRUE");
    const [[lastLog]] = await query("SELECT finished_at FROM scrape_logs WHERE status='success' ORDER BY finished_at DESC LIMIT 1");
    const newTodaySql =
      dialect === "postgres"
        ? "SELECT COUNT(*) as new_today FROM properties WHERE is_active = TRUE AND (first_seen::date) = CURRENT_DATE"
        : "SELECT COUNT(*) as new_today FROM properties WHERE is_active = TRUE AND DATE(first_seen) = CURDATE()";
    const [[today]] = await query(newTodaySql);

    res.json({
      total_active: active.total_active,
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

function runScraperNow(req, res, next) {
  try {
    const forceRescrape = Boolean(req.body?.forceRescrape);
    const scriptPath = path.join(__dirname, "..", "..", "scraper", "run_scraper.py");
    const python = process.env.SCRAPER_PYTHON || "python3";
    const source = (process.env.SCRAPER_SOURCE || "all").trim() || "all";
    const skipHours = forceRescrape ? "0" : (process.env.SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS || "336");
    const env = {
      ...process.env,
      SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS: skipHours
    };
    const cmd = `"${python}" "${scriptPath}" --source ${source}`;
    exec(cmd, { env, cwd: path.join(__dirname, "..", "..", "scraper") }, (error, stdout, stderr) => {
      if (error) {
        console.error("Scraper Fehler:", stderr || error.message);
        return;
      }
      console.log(stdout);
    });
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

module.exports = {
  getFilterOptions,
  getSources,
  getStats,
  getScrapeLogs,
  runScraperNow,
  getPriceHistogram: getPriceHistogramHandler,
  getPublicSitemap
};
