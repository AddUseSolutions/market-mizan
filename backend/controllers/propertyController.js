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
    const limit = Number(req.query.limit || 12);
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
    const [rows] = await query("SELECT * FROM properties WHERE property_id = ? LIMIT 1", [property_id]);
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

module.exports = { getProperties, getPropertyById, getFeatured };
