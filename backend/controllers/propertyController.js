const { query } = require("../db/connection");

function buildWhere(query) {
  const clauses = ["is_active = TRUE"];
  const params = [];

  if (query.min_price) {
    clauses.push("price >= ?");
    params.push(Number(query.min_price));
  }
  if (query.max_price) {
    clauses.push("price <= ?");
    params.push(Number(query.max_price));
  }
  if (query.bedrooms) {
    clauses.push("bedrooms >= ?");
    params.push(Number(query.bedrooms));
  }
  if (query.bathrooms) {
    clauses.push("bathrooms >= ?");
    params.push(Number(query.bathrooms));
  }
  if (query.property_type) {
    // DB-Werte kommen z. B. aus RealEthio als Title-Case ("Apartment For Sale");
    // feste UI-Strings oder alte Links koennen abweichen — case-insensitive vergleichen.
    clauses.push("LOWER(TRIM(property_type)) = LOWER(TRIM(?))");
    params.push(query.property_type);
  }
  if (query.listing_mode) {
    const mode = String(query.listing_mode).toLowerCase();
    if (mode === "for_rent") {
      clauses.push("LOWER(COALESCE(property_status, '')) LIKE ?");
      params.push("%rent%");
    } else if (mode === "for_sale") {
      clauses.push("LOWER(COALESCE(property_status, '')) LIKE ?");
      params.push("%sale%");
    }
  }
  if (query.area) {
    clauses.push("TRIM(COALESCE(location_area, '')) = TRIM(?)");
    params.push(query.area);
  } else if (query.district) {
    clauses.push("(location_area = ? OR location_district = ?)");
    params.push(query.district, query.district);
  }
  if (query.furnished !== undefined && query.furnished !== "") {
    clauses.push("furnished = ?");
    params.push(query.furnished === "true");
  }
  if (query.min_size) {
    clauses.push("property_size_m2 >= ?");
    params.push(Number(query.min_size));
  }
  if (query.max_size) {
    clauses.push("property_size_m2 <= ?");
    params.push(Number(query.max_size));
  }
  if (query.source) {
    clauses.push("source_website = ?");
    params.push(query.source);
  }
  if (query.search) {
    clauses.push("(title LIKE ? OR description LIKE ? OR location_district LIKE ?)");
    const s = `%${query.search}%`;
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
    const sort = req.query.sort || "latest";
    const orderBy = sort === "price_asc"
      ? "price ASC"
      : sort === "price_desc"
      ? "price DESC"
      : sort === "size_desc"
      ? "property_size_m2 DESC"
      : "first_seen DESC";

    const [countRows] = await query(`SELECT COUNT(*) as total FROM properties ${whereSql}`, params);
    const total = Number(countRows[0].total) || 0;
    const [rows] = await query(
      `SELECT * FROM properties ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      properties: rows,
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
    if (!rows.length) return res.status(404).json({ message: "Immobilie nicht gefunden" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function getFeatured(req, res, next) {
  try {
    const cap = 5000;
    const parsed = parseInt(String(req.query.limit ?? "500"), 10);
    const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, cap) : 500;
    const [rows] = await query(
      "SELECT * FROM properties WHERE is_active = TRUE ORDER BY first_seen DESC LIMIT ?",
      [limit]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function submitListing(req, res, next) {
  try {
    const body = req.body || {};
    const title = String(body.title || "").trim().slice(0, 255);
    const type = String(body.propertyType || "").trim().slice(0, 50);
    const listingMode = String(body.listingMode || "").trim().slice(0, 30);
    const availableFrom = String(body.availableFrom || "").trim().slice(0, 30);
    const contactName = String(body.contactName || "").trim().slice(0, 120);
    const contactEmail = String(body.contactEmail || "").trim().toLowerCase().slice(0, 254);
    const contactPhone = String(body.contactPhone || "").trim().slice(0, 40);
    const notes = String(body.notes || "").trim().slice(0, 2500);
    const price = Number(body.price);
    const sizeM2 = Number(body.sizeM2);
    const rooms = Number(body.rooms);
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!title || !type || !listingMode || !availableFrom || !contactName || !contactEmail) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return res.status(400).json({ message: "Please provide a valid email." });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ message: "Price must be a valid number." });
    }
    if (!Number.isFinite(sizeM2) || sizeM2 <= 0) {
      return res.status(400).json({ message: "Size must be a valid number." });
    }
    if (!Number.isFinite(rooms) || rooms <= 0) {
      return res.status(400).json({ message: "Rooms must be a valid number." });
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: "Please pin a valid location on the map." });
    }

    await query(
      `INSERT INTO listing_submissions
       (title, listing_mode, property_type, price, size_m2, rooms, available_from, contact_name, contact_email, contact_phone, latitude, longitude, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        listingMode,
        type,
        price,
        sizeM2,
        rooms,
        availableFrom,
        contactName,
        contactEmail,
        contactPhone || null,
        latitude,
        longitude,
        notes || null
      ]
    );

    return res.status(201).json({ ok: true, message: "Your listing was submitted successfully." });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProperties, getPropertyById, getFeatured, submitListing };
