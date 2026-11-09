/**
 * Import Hoblen.com developer projects (admin-only “New Building” preview).
 * Mirrors scraper/scrapers/hoblen_scraper.py against api.hoblen.com.
 */
const { query, dialect } = require("../db/connection");
const { getEtbPerUsd, todayIsoDate } = require("./fxRate");
const { resolveCanonicalAreaOrDefault } = require("./canonicalAreas");

const API_BASE = "https://api.hoblen.com";
const SITE_BASE = "https://hoblen.com";
const SOURCE_WEBSITE = "hoblen.com";
const SOURCE_NAME = "Hoblen";

function headers() {
  return {
    "User-Agent":
      "Mozilla/5.0 (compatible; MarketMizanBot/1.0; +https://mmizan.com)",
    Accept: "application/json",
    Origin: SITE_BASE,
    Referer: `${SITE_BASE}/property`
  };
}

async function getJson(path, params = {}) {
  const url = new URL(path, API_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(40000) });
  if (!response.ok) {
    throw new Error(`Hoblen HTTP ${response.status} for ${url.pathname}`);
  }
  return response.json();
}

function parseNumber(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const n = Number(String(raw).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function bedroomsFrom(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (Array.isArray(raw)) {
    const nums = raw
      .map((item) => {
        if (typeof item === "string" && /studio/i.test(item)) return 0;
        return parseNumber(item);
      })
      .filter((n) => n != null);
    return nums.length ? Math.max(...nums) : null;
  }
  if (typeof raw === "string") return parseNumber(raw);
  return null;
}

function pricePair(item, rate) {
  const currency = String(item?.currency || "ETB").toUpperCase();
  const saleType = String(item?.saleType || "").toUpperCase();
  const priceType = String(item?.priceType || "").toUpperCase();
  let raw = null;
  if (saleType === "RENT") raw = item?.rentalPrice;
  else {
    raw = item?.specificPrice;
    if (raw == null || raw === 0 || raw === "0" || raw === "") {
      const pr = item?.priceRange || {};
      if (pr && typeof pr === "object") raw = pr.min || pr.from || pr.low;
    }
    if ((raw == null || raw === 0 || raw === "0" || raw === "") && priceType === "PRICE_PER_SQUARE_METER") {
      raw = item?.pricePerSquareMeter;
    }
  }
  const amount = parseNumber(raw);
  if (!amount || amount <= 0) return { price_etb: null, price_usd: null, currency: "ETB" };
  if (currency === "USD") {
    return { price_etb: Math.round(amount * rate * 100) / 100, price_usd: amount, currency };
  }
  return { price_etb: amount, price_usd: Math.round((amount / rate) * 100) / 100, currency };
}

function collectImages(item) {
  const out = [];
  const cover = item?.cover || {};
  if (cover && typeof cover === "object") {
    for (const key of ["processedUrl", "url", "thumbnailUrl"]) {
      const u = cover[key];
      if (typeof u === "string" && /^https?:\/\//i.test(u)) {
        out.push(u);
        break;
      }
    }
  }
  for (const media of item?.media || []) {
    if (!media || typeof media !== "object") continue;
    const type = String(media.type || "").toUpperCase();
    if (type && type !== "IMAGE" && type !== "IMG") continue;
    for (const key of ["processedUrl", "url", "thumbnailUrl"]) {
      const u = media[key];
      if (typeof u === "string" && /^https?:\/\//i.test(u)) {
        out.push(u);
        break;
      }
    }
  }
  if (typeof item?.image === "string" && /^https?:\/\//i.test(item.image)) out.push(item.image);
  return [...new Set(out)].slice(0, 6);
}

function furnished(item) {
  const status = String(item?.furnishingStatus || "").toLowerCase();
  if (status.includes("unfurnish") || status.includes("not furnish")) return false;
  return status.includes("furnish");
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shapeItem(item, rate) {
  const oid = item?._id;
  if (!oid) return null;
  const title = cleanText(item.name);
  if (!title) return null;
  const saleType = String(item.saleType || "SELL").toUpperCase();
  const status = saleType === "RENT" ? "For Rent" : "For Sale";
  const prices = pricePair(item, rate);
  const addr = item.address || {};
  const coords = addr.location?.coordinates || [];
  const lng = coords.length >= 2 && coords[0] != null ? Number(coords[0]) : null;
  const lat = coords.length >= 2 && coords[1] != null ? Number(coords[1]) : null;
  let areaHint = cleanText(addr.addressLine1 || "");
  const city = cleanText(addr.city || "Addis Ababa") || "Addis Ababa";
  for (const token of ["Bole", "Yeka", "Kirkos", "Arada", "Lideta", "Nifas Silk", "CMC", "Kazanchis", "Old Airport"]) {
    if (areaHint.toLowerCase().includes(token.toLowerCase())) {
      areaHint = token;
      break;
    }
  }
  const features = [];
  const rawFeatures = item.keyFeatures || item.propertyFeatures || [];
  const featureList = Array.isArray(rawFeatures) ? rawFeatures : [];
  for (const feat of featureList) {
    if (typeof feat === "string") features.push(cleanText(feat));
    else if (feat && typeof feat === "object") features.push(cleanText(feat.name || feat.label || ""));
  }
  const filtered = features.filter(Boolean).slice(0, 24);
  if (item.furnishingStatus) filtered.unshift(cleanText(String(item.furnishingStatus)));
  const originalType = cleanText(item.propertyType || "Apartment") || "Apartment";
  if (originalType.toLowerCase() !== "new building") filtered.unshift(originalType);
  if (item.underConstruction) filtered.push("Under construction");

  const propertyId = String(item.propertyId || `HL${String(oid).slice(-7)}`).slice(0, 50);
  const detailUrl = `${SITE_BASE}/property/detail/${oid}`;
  const description = cleanText(item.description || "").slice(0, 4000);
  const row = {
    property_id: propertyId,
    source_website: SOURCE_WEBSITE,
    source_name: SOURCE_NAME,
    detail_url: detailUrl,
    title: title.slice(0, 255),
    price: prices.price_etb,
    price_etb: prices.price_etb,
    price_usd: prices.price_usd,
    fx_rate_etb_usd: rate,
    fx_rate_date: todayIsoDate(),
    currency: prices.currency,
    property_size_m2: parseNumber(item.size),
    bedrooms: bedroomsFrom(item.bedrooms),
    bathrooms: parseNumber(item.bathrooms),
    garage: parseNumber(item.garage),
    property_type: "New Building",
    property_status: status,
    furnished: furnished(item),
    features: filtered,
    images: collectImages(item),
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    location_city: city,
    location_area: areaHint || null,
    location_district: areaHint || null,
    description,
    description_original: description,
    description_summary: description ? description.slice(0, 500) : null,
    is_scraped: true,
    listing_origin: "crawled",
    verification_status: item.isVerified ? "verified" : "unverified",
    is_paid: false,
    publisher_type: "developer",
    verified_at: item.isVerified ? item.updatedAt || item.createdAt || null : null
  };
  row.canonical_area = resolveCanonicalAreaOrDefault(row);
  return row;
}

function jsonParam(value) {
  return dialect === "postgres" ? JSON.stringify(value || []) : JSON.stringify(value || []);
}

async function upsertHoblenRow(row) {
  const [existing] = await query(
    `SELECT id FROM properties WHERE source_website = ? AND property_id = ? LIMIT 1`,
    [row.source_website, row.property_id]
  );
  const values = [
    row.title,
    row.price,
    row.price_etb,
    row.price_usd,
    row.fx_rate_etb_usd,
    row.fx_rate_date,
    row.currency,
    row.property_size_m2,
    row.bedrooms,
    row.bathrooms,
    row.garage,
    row.property_type,
    row.property_status,
    row.furnished,
    jsonParam(row.features),
    jsonParam(row.images),
    row.latitude,
    row.longitude,
    row.location_city,
    row.location_area,
    row.location_district,
    row.canonical_area,
    row.description,
    row.description_original,
    row.description_summary,
    row.is_scraped,
    row.listing_origin,
    row.verification_status,
    row.is_paid,
    row.publisher_type,
    row.verified_at,
    row.detail_url,
    row.source_name
  ];
  if (existing.length) {
    await query(
      `UPDATE properties SET
        title = ?, price = ?, price_etb = ?, price_usd = ?, fx_rate_etb_usd = ?, fx_rate_date = ?,
        currency = ?, property_size_m2 = ?, bedrooms = ?, bathrooms = ?, garage = ?,
        property_type = ?, property_status = ?, furnished = ?, features = ?, images = ?,
        latitude = ?, longitude = ?, location_city = ?, location_area = ?, location_district = ?,
        canonical_area = ?, description = ?, description_original = ?, description_summary = ?,
        is_scraped = ?, listing_origin = ?, verification_status = ?, is_paid = ?, publisher_type = ?,
        verified_at = ?, detail_url = ?, source_name = ?,
        is_active = TRUE, last_seen = NOW(), scraped_at = NOW()
       WHERE id = ?`,
      [...values, existing[0].id]
    );
    return "updated";
  }
  await query(
    `INSERT INTO properties (
      property_id, source_website, source_name, detail_url, title, price, price_etb, price_usd,
      fx_rate_etb_usd, fx_rate_date, currency, property_size_m2, bedrooms, bathrooms, garage,
      property_type, property_status, furnished, features, images, latitude, longitude,
      location_city, location_area, location_district, canonical_area,
      description, description_original, description_summary,
      is_scraped, listing_origin, verification_status, is_paid, publisher_type, verified_at,
      is_active, first_seen, last_seen, scraped_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      TRUE, NOW(), NOW(), NOW()
    )`,
    [
      row.property_id,
      row.source_website,
      row.source_name,
      row.detail_url,
      row.title,
      row.price,
      row.price_etb,
      row.price_usd,
      row.fx_rate_etb_usd,
      row.fx_rate_date,
      row.currency,
      row.property_size_m2,
      row.bedrooms,
      row.bathrooms,
      row.garage,
      row.property_type,
      row.property_status,
      row.furnished,
      jsonParam(row.features),
      jsonParam(row.images),
      row.latitude,
      row.longitude,
      row.location_city,
      row.location_area,
      row.location_district,
      row.canonical_area,
      row.description,
      row.description_original,
      row.description_summary,
      row.is_scraped,
      row.listing_origin,
      row.verification_status,
      row.is_paid,
      row.publisher_type,
      row.verified_at
    ]
  );
  return "inserted";
}

async function discoverIds({ limit = 80, maxPages = 5 } = {}) {
  const found = [];
  let page = 1;
  while (page <= maxPages && found.length < limit) {
    const payload = await getJson("/user/property", { page, limit: 50 });
    const data = payload?.data || {};
    const rows = data.properties || [];
    if (!rows.length) break;
    for (const row of rows) {
      if (!row?._id) continue;
      found.push(String(row._id));
      if (found.length >= limit) break;
    }
    const totalPages = Number(data.totalPages || page);
    if (page >= totalPages || data.hasMore === false) break;
    page += 1;
  }
  return found;
}

/**
 * @param {{ limit?: number, maxPages?: number }} [opts]
 */
async function importHoblenListings(opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 80, 1), 400);
  const maxPages = Math.min(Math.max(Number(opts.maxPages) || 5, 1), 20);
  const rate = getEtbPerUsd();
  const ids = await discoverIds({ limit, maxPages });
  let inserted = 0;
  let updated = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      const payload = await getJson(`/user/property/${id}`);
      const item = payload?.data?.property;
      const row = shapeItem(item, rate);
      if (!row) {
        failed += 1;
        continue;
      }
      const result = await upsertHoblenRow(row);
      if (result === "inserted") inserted += 1;
      else updated += 1;
    } catch {
      failed += 1;
    }
  }
  return { discovered: ids.length, inserted, updated, failed };
}

/** One-shot seed when the catalog has no Hoblen rows yet. */
async function ensureHoblenPreviewSeed() {
  if (/^(0|false|no|off)$/i.test(String(process.env.HOBLEN_SYNC_ON_BOOT || "true"))) {
    return { skipped: true, reason: "disabled" };
  }
  const countSql =
    dialect === "postgres"
      ? `SELECT COUNT(*)::int AS n FROM properties WHERE LOWER(COALESCE(source_website, '')) LIKE '%hoblen%'`
      : `SELECT COUNT(*) AS n FROM properties WHERE LOWER(COALESCE(source_website, '')) LIKE '%hoblen%'`;
  const [rows] = await query(countSql);
  const rawCount = rows?.[0]?.n ?? rows?.[0]?.count ?? Object.values(rows?.[0] || {})[0];
  const count = Number(rawCount || 0);
  if (count > 0) return { skipped: true, reason: "already_present", count };
  const result = await importHoblenListings({ limit: 60, maxPages: 3 });
  return { skipped: false, ...result };
}

module.exports = {
  importHoblenListings,
  ensureHoblenPreviewSeed,
  shapeItem,
  SOURCE_WEBSITE
};
