const { query, dialect } = require("../db/connection");

const FETCH_TIMEOUT_MS = 45000;
const SLEEP_MS = 700;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseEtbAmount(raw) {
  if (raw == null) return null;
  const s = String(raw).replace(/[^\d.]/g, "");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Ignore tiny numbers that are clearly not asking prices
  if (n < 1000) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Extract ETB asking price from Houzez / RealEthio / EthiopiaRealty HTML.
 */
function extractEtbPriceFromHtml(html) {
  const text = String(html || "");
  const patterns = [
    /asking\s+price\s+is\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*ETB/i,
    /property-price[^>]*>[\s\S]{0,120}?([0-9][0-9,]*(?:\.[0-9]+)?)/i,
    /itemprop=["']price["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*itemprop=["']price["']/i,
    /(?:ETB|Br\.?|Birr)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i,
    /([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:ETB|Br\.?|Birr)/i
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const n = parseEtbAmount(m[1]);
    if (n) return n;
  }
  return null;
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://realethio.com/"
      },
      redirect: "follow"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function listZeroPriceForRepair({ limit = 40, propertyIds = [] } = {}) {
  const ids = (propertyIds || []).map((x) => String(x).trim()).filter(Boolean);
  if (ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await query(
      `SELECT property_id, detail_url, price, price_etb, title
       FROM properties
       WHERE property_id IN (${placeholders})
         AND is_active = TRUE
         AND detail_url IS NOT NULL AND detail_url <> ''`,
      ids
    );
    return rows || [];
  }

  const lim = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 150) : 40;
  const [rows] = await query(
    `SELECT property_id, detail_url, price, price_etb, title
     FROM properties
     WHERE is_active = TRUE
       AND detail_url IS NOT NULL AND detail_url <> ''
       AND source_website IN ('realethio.com', 'ethiopiarealty.com')
       AND (COALESCE(price_etb, 0) <= 0 AND COALESCE(price, 0) <= 0)
     ORDER BY last_seen DESC
     LIMIT ?`,
    [lim]
  );
  return rows || [];
}

async function updatePrice(propertyId, priceEtb) {
  const etb = Number(priceEtb);
  if (!Number.isFinite(etb) || etb <= 0) return;
  await query(
    `UPDATE properties
     SET price_etb = ?,
         price = ?,
         currency = COALESCE(NULLIF(TRIM(currency), ''), 'ETB')
     WHERE property_id = ?`,
    [etb, etb, propertyId]
  );
}

/**
 * Re-fetch missing ETB prices for RealEthio / EthiopiaRealty listings.
 */
async function repairListingPrices({
  limit = 40,
  sleepMs = SLEEP_MS,
  propertyIds = [],
  pricesById = null,
  onProgress
} = {}) {
  const todo = await listZeroPriceForRepair({ limit, propertyIds });
  const results = {
    total: todo.length,
    fixed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };
  const overrides =
    pricesById && typeof pricesById === "object" && !Array.isArray(pricesById) ? pricesById : null;

  for (let i = 0; i < todo.length; i += 1) {
    const row = todo[i];
    const propertyId = row.property_id;
    try {
      let priceEtb = null;
      const override = overrides?.[propertyId];
      if (override != null) priceEtb = parseEtbAmount(override);
      if (!priceEtb) {
        const html = await fetchHtml(row.detail_url);
        priceEtb = extractEtbPriceFromHtml(html);
      }
      if (!priceEtb) {
        results.failed += 1;
        results.details.push({ propertyId, ok: false, reason: "no price found" });
      } else {
        await updatePrice(propertyId, priceEtb);
        results.fixed += 1;
        results.details.push({ propertyId, ok: true, priceEtb });
      }
    } catch (err) {
      results.failed += 1;
      results.details.push({ propertyId, ok: false, reason: err.message || String(err) });
    }
    if (typeof onProgress === "function") onProgress(i + 1, todo.length, results);
    if (i < todo.length - 1 && sleepMs > 0) await sleep(sleepMs);
  }

  return results;
}

module.exports = {
  repairListingPrices,
  extractEtbPriceFromHtml,
  parseEtbAmount
};
