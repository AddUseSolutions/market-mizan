const { query, dialect } = require("../db/connection");
const { exec } = require("child_process");
const path = require("path");

async function getFilterOptions(req, res, next) {
  try {
    // Nur DB-Feld location_area — wie „Area:“ auf der Detailseite, ohne Adress-Teile.
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
    const [price] = await query(
      "SELECT MIN(price) as min_price, MAX(price) as max_price FROM properties WHERE is_active = TRUE"
    );
    res.json({
      areas: areas.map((a) => a.la).filter(Boolean),
      property_types: types.map((t) => t.property_type),
      price_range: price[0]
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
        ? "SELECT COUNT(*) as new_today FROM properties WHERE (first_seen::date) = CURRENT_DATE"
        : "SELECT COUNT(*) as new_today FROM properties WHERE DATE(first_seen) = CURDATE()";
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
    const scriptPath = path.join(__dirname, "..", "..", "scraper", "run_scraper.py");
    exec(`python "${scriptPath}" --source realethio`, (error, stdout, stderr) => {
      if (error) {
        console.error("Scraper Fehler:", stderr || error.message);
      }
      console.log(stdout);
    });
    res.json({ message: "Scraper wurde gestartet." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFilterOptions,
  getSources,
  getStats,
  getScrapeLogs,
  runScraperNow
};
