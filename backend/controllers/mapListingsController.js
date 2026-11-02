const { query, dialect } = require("../db/connection");
const { publicCatalogWhereSql, rentalStatusSql, saleStatusSql } = require("../utils/listingFilters");
const { shapeMapListing } = require("../utils/mapListings");

const MAX_PINS = 4000;

async function getMapListings(req, res, next) {
  try {
    const mode = String(req.query.listing_mode || "").toLowerCase();
    const clauses = [publicCatalogWhereSql(dialect)];
    if (mode === "for_rent" || mode === "rent") clauses.push(rentalStatusSql());
    else if (mode === "for_sale" || mode === "sale") clauses.push(saleStatusSql());

    const [rows] = await query(
      `SELECT property_id, title, price, price_etb, price_usd, property_status,
              bedrooms, latitude, longitude, canonical_area, location_area, images
       FROM properties
       WHERE ${clauses.join("\n AND ")}
       ORDER BY property_id ASC
       LIMIT ${MAX_PINS}`
    );
    const listings = (rows || []).map(shapeMapListing).filter(Boolean);
    res.json({
      listings,
      total: listings.length,
      capped: listings.length >= MAX_PINS
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMapListings };
