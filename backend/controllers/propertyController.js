const { query } = require("../db/connection");
const { applyUsdPricing, getEtbPerUsd, todayIsoDate, etbToUsd } = require("../utils/fxRate");
const { resolveOrderBy } = require("../utils/listingRank");

function enrichProperty(row) {
  if (!row) return row;
  return applyUsdPricing(row);
}

function buildWhere(queryParams) {
  const clauses = ["is_active = TRUE"];
  const params = [];

  const priceCol = "COALESCE(price_usd, price)";
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
  if (queryParams.property_type) {
    clauses.push("LOWER(TRIM(property_type)) = LOWER(TRIM(?))");
    params.push(queryParams.property_type);
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
  if (queryParams.city) {
    clauses.push("LOWER(TRIM(COALESCE(location_city, ''))) = LOWER(TRIM(?))");
    params.push(queryParams.city);
  }
  if (queryParams.area) {
    clauses.push("TRIM(COALESCE(location_area, '')) = TRIM(?)");
    params.push(queryParams.area);
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
    clauses.push("(title LIKE ? OR description LIKE ? OR location_district LIKE ?)");
    const s = `%${queryParams.search}%`;
    params.push(s, s, s);
  }

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

    const [countRows] = await query(`SELECT COUNT(*) as total FROM properties ${whereSql}`, params);
    const total = Number(countRows[0].total) || 0;
    const [rows] = await query(
      `SELECT * FROM properties ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      properties: rows.map(enrichProperty),
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
    const [rows] = await query(
      "SELECT * FROM properties WHERE property_id = ? AND is_active = TRUE LIMIT 1",
      [property_id]
    );
    if (!rows.length) return res.status(404).json({ message: "Property not found" });
    res.json(enrichProperty(rows[0]));
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
    const [rows] = await query(
      `SELECT * FROM properties WHERE is_active = TRUE ORDER BY ${orderBy} LIMIT ?`,
      [limit]
    );
    res.json(rows.map(enrichProperty));
  } catch (error) {
    next(error);
  }
}

async function submitListing(req, res, next) {
  try {
    const body = req.body || {};
    const title = String(body.title || "").trim().slice(0, 255);
    const type = String(body.propertyType || "").trim().slice(0, 80);
    const category = String(body.propertyCategory || "").trim().slice(0, 30);
    const listingMode = String(body.listingMode || "").trim().slice(0, 30);
    const availableFrom = String(body.availableFrom || "").trim().slice(0, 30);
    const contactName = String(body.contactName || "").trim().slice(0, 120);
    const contactEmail = String(body.contactEmail || "").trim().toLowerCase().slice(0, 254);
    const contactPhone = String(body.contactPhone || "").trim().slice(0, 40);
    const notes = String(body.notes || "").trim().slice(0, 2500);
    const aiTitle = String(body.aiTitleSuggestion || "").trim().slice(0, 500);
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
      return res.status(400).json({ message: "Please fill all required fields." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return res.status(400).json({ message: "Please provide a valid email." });
    }
    if (!Number.isFinite(priceEtb) || priceEtb <= 0) {
      return res.status(400).json({ message: "Price must be a valid number." });
    }
    if (!Number.isFinite(sizeM2) || sizeM2 <= 0) {
      return res.status(400).json({ message: "Size must be a valid number." });
    }
    if (!Number.isFinite(bedrooms) || bedrooms <= 0) {
      return res.status(400).json({ message: "Bedrooms must be a valid number." });
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: "Please pin a valid location on the map." });
    }

    const etbPerUsd = getEtbPerUsd();
    const fxDate = todayIsoDate();
    const priceUsd = etbToUsd(priceEtb, etbPerUsd);

    await query(
      `INSERT INTO listing_submissions
       (title, listing_mode, property_type, property_category, price, size_m2, land_area_m2,
        rooms, bedrooms, bathrooms, kitchens, living_rooms, maid_bedrooms, maid_bathrooms,
        available_from, contact_name, contact_email, contact_phone, latitude, longitude, notes,
        price_etb, price_usd, fx_rate_etb_usd, fx_rate_date, ai_title_suggestion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        listingMode,
        type,
        category || null,
        priceEtb,
        sizeM2,
        landAreaM2,
        rooms,
        bedrooms,
        bathrooms,
        kitchens,
        livingRooms,
        maidBedrooms,
        maidBathrooms,
        availableFrom,
        contactName,
        contactEmail,
        contactPhone || null,
        latitude,
        longitude,
        notes || null,
        priceEtb,
        priceUsd,
        etbPerUsd,
        fxDate,
        aiTitle || null
      ]
    );

    return res.status(201).json({ ok: true, message: "Your listing was submitted successfully." });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProperties, getPropertyById, getFeatured, submitListing };
