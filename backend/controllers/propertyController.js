const { query, dialect } = require("../db/connection");
const { applyUsdPricingAsync, getEtbPerUsd, todayIsoDate, etbToUsd } = require("../utils/fxRate");
const { resolveOrderBy } = require("../utils/listingRank");
const { isCanonicalArea, resolveCanonicalAreaOrDefault } = require("../utils/canonicalAreas");
const { enrichWithHmlo, fetchAreaMedians, fetchAreaMediansMysql } = require("../utils/hmlo");
const { clampString, clampEmail, slugPropertyId } = require("../utils/sanitize");
const { uploadListingImages, filesToDataUrls } = require("../middleware/upload");
const { sanitizePropertyForClient } = require("../utils/propertyResponse");
const { TYPE_GROUP_PATTERNS, priceCapClause } = require("../utils/listingFilters");

let medianCache = { map: {}, at: 0 };

async function getAreaMedians() {
  if (Date.now() - medianCache.at < 5 * 60 * 1000) return medianCache.map;
  const map =
    dialect === "postgres" ? await fetchAreaMedians(query) : await fetchAreaMediansMysql(query);
  medianCache = { map, at: Date.now() };
  return map;
}

async function enrichProperty(row, areaMedians, user = null) {
  if (!row) return row;
  const priced = await applyUsdPricingAsync(row);
  return sanitizePropertyForClient(enrichWithHmlo(priced, areaMedians), user);
}

const DEFAULT_CITY = "Addis Ababa";

function buildWhere(queryParams) {
  const clauses = ["is_active = TRUE"];
  const params = [];
  const priceCol = "COALESCE(price_usd, price)";

  clauses.push("LOWER(TRIM(COALESCE(NULLIF(TRIM(location_city), ''), ?))) = LOWER(TRIM(?))");
  params.push(DEFAULT_CITY, DEFAULT_CITY);

  // Hide incomplete crawl stubs (no real title or images yet)
  clauses.push("(title IS NOT NULL AND TRIM(title) <> '' AND title NOT LIKE 'Listing %')");
  if (dialect === "postgres") {
    clauses.push(
      "(images IS NOT NULL AND images::text NOT IN ('[]', 'null', '') AND LENGTH(TRIM(images::text)) > 2)"
    );
  } else {
    clauses.push("(images IS NOT NULL AND JSON_LENGTH(images) > 0)");
  }

  if (queryParams.min_price) {
    clauses.push(`${priceCol} >= ?`);
    params.push(Number(queryParams.min_price));
  }
  if (queryParams.max_price) {
    clauses.push(`${priceCol} <= ?`);
    params.push(Number(queryParams.max_price));
  }
  if (queryParams.bedrooms) {
    clauses.push("bedrooms >= ?");
    params.push(Number(queryParams.bedrooms));
  }
  if (queryParams.bathrooms) {
    clauses.push("bathrooms >= ?");
    params.push(Number(queryParams.bathrooms));
  }
  const splitMulti = (value) =>
    String(value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  if (queryParams.property_type) {
    const types = splitMulti(queryParams.property_type);
    if (types.length === 1) {
      clauses.push("LOWER(TRIM(property_type)) = LOWER(TRIM(?))");
      params.push(types[0]);
    } else if (types.length > 1) {
      clauses.push(`(${types.map(() => "LOWER(TRIM(property_type)) = LOWER(TRIM(?))").join(" OR ")})`);
      params.push(...types);
    }
  } else if (queryParams.property_type_group) {
    const groups = splitMulti(queryParams.property_type_group);
    const groupClauses = [];
    for (const groupKey of groups) {
      const patterns = TYPE_GROUP_PATTERNS[String(groupKey).toLowerCase()];
      if (!patterns?.length) continue;
      const orParts = patterns.map(() => "LOWER(COALESCE(property_type, '')) LIKE ?");
      groupClauses.push(`(${orParts.join(" OR ")})`);
      params.push(...patterns.map((p) => p.toLowerCase()));
    }
    if (groupClauses.length === 1) clauses.push(groupClauses[0]);
    else if (groupClauses.length > 1) clauses.push(`(${groupClauses.join(" OR ")})`);
  }
  if (queryParams.listing_mode) {
    const mode = String(queryParams.listing_mode).toLowerCase();
    if (mode === "for_rent") {
      clauses.push("LOWER(COALESCE(property_status, '')) LIKE ?");
      params.push("%rent%");
    } else if (mode === "for_sale") {
      clauses.push("LOWER(COALESCE(property_status, '')) LIKE ?");
      params.push("%sale%");
    }
  }
  if (queryParams.area) {
    const areas = splitMulti(queryParams.area).filter(isCanonicalArea);
    if (areas.length === 1) {
      clauses.push("TRIM(COALESCE(canonical_area, '')) = TRIM(?)");
      params.push(areas[0]);
    } else if (areas.length > 1) {
      clauses.push(`(${areas.map(() => "TRIM(COALESCE(canonical_area, '')) = TRIM(?)").join(" OR ")})`);
      params.push(...areas);
    }
  } else if (queryParams.district) {
    clauses.push("(location_area = ? OR location_district = ?)");
    params.push(queryParams.district, queryParams.district);
  }
  if (queryParams.furnished !== undefined && queryParams.furnished !== "") {
    clauses.push("furnished = ?");
    params.push(queryParams.furnished === "true");
  }
  if (queryParams.min_size) {
    clauses.push("property_size_m2 >= ?");
    params.push(Number(queryParams.min_size));
  }
  if (queryParams.max_size) {
    clauses.push("property_size_m2 <= ?");
    params.push(Number(queryParams.max_size));
  }
  if (queryParams.source) {
    clauses.push("source_website = ?");
    params.push(queryParams.source);
  }
  if (queryParams.search) {
    clauses.push(
      "(title LIKE ? OR description LIKE ? OR description_original LIKE ? OR location_district LIKE ?)"
    );
    const s = `%${queryParams.search}%`;
    params.push(s, s, s, s);
  }

  clauses.push(priceCapClause());

  return { whereSql: `WHERE ${clauses.join(" AND ")}`, params };
}

async function getProperties(req, res, next) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const offset = (page - 1) * limit;
    const { whereSql, params } = buildWhere(req.query);
    const sort = req.query.sort || "ranked";
    const orderBy = resolveOrderBy(sort);
    const medians = await getAreaMedians();

    const [countRows] = await query(`SELECT COUNT(*) as total FROM properties ${whereSql}`, params);
    const total = Number(countRows[0].total) || 0;
    const [rows] = await query(
      `SELECT * FROM properties ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      properties: await Promise.all(rows.map((r) => enrichProperty(r, medians, req.user))),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
}

async function getPropertyById(req, res, next) {
  try {
    const { property_id } = req.params;
    const medians = await getAreaMedians();
    const [rows] = await query(
      "SELECT * FROM properties WHERE property_id = ? AND is_active = TRUE LIMIT 1",
      [property_id]
    );
    if (!rows.length) return res.status(404).json({ message: "Property not found" });
    res.json(await enrichProperty(rows[0], medians, req.user));
  } catch (error) {
    next(error);
  }
}

async function getPriceHistory(req, res, next) {
  try {
    const [rows] = await query(
      `SELECT price_etb, price_usd, recorded_at FROM price_history WHERE property_id = ? ORDER BY recorded_at ASC LIMIT 50`,
      [req.params.property_id]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function getFeatured(req, res, next) {
  try {
    const cap = 5000;
    const parsed = parseInt(String(req.query.limit ?? "500"), 10);
    const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, cap) : 500;
    const orderBy = resolveOrderBy("ranked");
    const medians = await getAreaMedians();
    const [rows] = await query(
      `SELECT * FROM properties WHERE is_active = TRUE ORDER BY ${orderBy} LIMIT ?`,
      [limit]
    );
    res.json(await Promise.all(rows.map((r) => enrichProperty(r, medians, req.user))));
  } catch (error) {
    next(error);
  }
}

async function submitListing(req, res, next) {
  try {
    const body = req.body || {};
    if (body.website) return res.status(201).json({ ok: true, message: "Received." });

    const title = clampString(body.title, 255);
    const type = clampString(body.propertyType, 80);
    const category = clampString(body.propertyCategory, 30);
    const listingMode = clampString(body.listingMode, 30);
    const availableFrom = clampString(body.availableFrom, 30);
    const contactName = clampString(body.contactName, 120);
    const contactEmail = clampEmail(body.contactEmail);
    const contactPhone = clampString(body.contactPhone, 40);
    const notes = clampString(body.notes, 2500);
    const aiTitle = clampString(body.aiTitleSuggestion, 500);
    const aiDescription = clampString(body.aiDescription, 2500);
    const locationArea = clampString(body.locationArea, 255);
    const locationCity = clampString(body.locationCity || "Addis Ababa", 100);
    const priceEtb = Number(body.price);
    const sizeM2 = Number(body.sizeM2);
    const landAreaM2 = body.landAreaM2 != null && body.landAreaM2 !== "" ? Number(body.landAreaM2) : null;
    const bedrooms = Number(body.bedrooms ?? body.rooms);
    const bathrooms = body.bathrooms != null && body.bathrooms !== "" ? Number(body.bathrooms) : null;
    const kitchens = body.kitchens != null && body.kitchens !== "" ? Number(body.kitchens) : null;
    const livingRooms = body.livingRooms != null && body.livingRooms !== "" ? Number(body.livingRooms) : null;
    const maidBedrooms = body.maidBedrooms != null && body.maidBedrooms !== "" ? Number(body.maidBedrooms) : null;
    const maidBathrooms = body.maidBathrooms != null && body.maidBathrooms !== "" ? Number(body.maidBathrooms) : null;
    const rooms = Number(body.rooms ?? bedrooms);
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!title || !type || !listingMode || !availableFrom || !contactName || !contactEmail) {
      const missing = [];
      if (!title) missing.push("title");
      if (!type) missing.push("property type");
      if (!listingMode) missing.push("listing mode");
      if (!availableFrom) missing.push("available-from date");
      if (!contactName) missing.push("contact name");
      if (!contactEmail) missing.push("valid contact email");
      return res.status(400).json({
        message: `Please complete: ${missing.join(", ")}.`
      });
    }
    if (!Number.isFinite(priceEtb) || priceEtb <= 0) {
      return res.status(400).json({ message: "Price must be a valid number." });
    }
    if (!Number.isFinite(sizeM2) || sizeM2 <= 0) {
      return res.status(400).json({ message: "Size must be a valid number." });
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: "Please pin a valid location on the map." });
    }
    if (!locationArea || !isCanonicalArea(locationArea)) {
      return res.status(400).json({ message: "Please select a valid sub-city area." });
    }

    const etbPerUsd = getEtbPerUsd();
    const fxDate = todayIsoDate();
    const priceUsd = etbToUsd(priceEtb, etbPerUsd);
    const imageUrls = filesToDataUrls(req.files);
    const imagesJson = JSON.stringify(imageUrls);

    const descriptionOriginal = notes || null;
    const descriptionSummary = aiDescription || null;

    await query(
      `INSERT INTO listing_submissions
       (title, listing_mode, property_type, property_category, price, size_m2, land_area_m2,
        rooms, bedrooms, bathrooms, kitchens, living_rooms, maid_bedrooms, maid_bathrooms,
        available_from, contact_name, contact_email, contact_phone, latitude, longitude, notes,
        price_etb, price_usd, fx_rate_etb_usd, fx_rate_date, ai_title_suggestion, ai_description,
        description_original, description_summary,
        location_area, location_city, images, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        title, listingMode, type, category || null, priceEtb, sizeM2, landAreaM2,
        rooms, bedrooms, bathrooms, kitchens, livingRooms, maidBedrooms, maidBathrooms,
        availableFrom, contactName, contactEmail, contactPhone || null, latitude, longitude, notes || null,
        priceEtb, priceUsd, etbPerUsd, fxDate, aiTitle || null, aiDescription || null,
        descriptionOriginal, descriptionSummary,
        locationArea || null, locationCity, imagesJson
      ]
    );

    return res.status(201).json({ ok: true, message: "Your listing was submitted for review." });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProperties,
  getPropertyById,
  getFeatured,
  submitListing,
  getPriceHistory
};
