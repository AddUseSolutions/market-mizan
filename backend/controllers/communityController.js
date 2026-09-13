const { query, dialect } = require("../db/connection");
const { clampString, clampEmail } = require("../utils/sanitize");
const { applyUsdPricing, isPlausibleListingPrice } = require("../utils/fxRate");
const { enrichWithHmlo, fetchAreaMedians, fetchAreaMediansMysql } = require("../utils/hmlo");
const { sanitizePropertyForClient } = require("../utils/propertyResponse");
const { verifiedTierSql } = require("../utils/listingRank");
const { isCanonicalArea } = require("../utils/canonicalAreas");

async function getAreaMedians() {
  return dialect === "postgres" ? fetchAreaMedians(query) : fetchAreaMediansMysql(query);
}

function hasImages(row) {
  const raw = row?.images;
  if (Array.isArray(raw) && raw.length) return true;
  if (typeof raw === "string" && raw.trim() && raw !== "[]") return true;
  return false;
}

async function postReview(req, res, next) {
  try {
    const { propertyId, email, rating, comment, website } = req.body || {};
    if (website) return res.json({ ok: true }); // honeypot

    const pid = clampString(propertyId, 50);
    const em = clampEmail(email);
    const r = clampString(rating, 2);
    const rate = Number(r);
    const msg = clampString(comment, 2000);

    if (!pid || !em) return res.status(400).json({ message: "Property and valid email required." });
    if (!Number.isInteger(rate) || rate < 1 || rate > 5) {
      return res.status(400).json({ message: "Rating must be 1–5." });
    }

    const [existing] = await query(
      `SELECT id FROM property_reviews WHERE property_id = ? AND reviewer_email = ? LIMIT 1`,
      [pid, em]
    );
    if (existing.length) {
      return res.status(409).json({ message: "You already reviewed this listing." });
    }

    const userId = req.user?.id || null;
    await query(
      `INSERT INTO property_reviews (property_id, user_id, reviewer_email, rating, comment, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [pid, userId, em, rate, msg || null]
    );
    res.status(201).json({ ok: true, moderated: true });
  } catch (e) {
    next(e);
  }
}

async function getReviews(req, res, next) {
  try {
    const pid = req.params.property_id;
    const [rows] = await query(
      `SELECT rating, comment, reviewer_email, created_at FROM property_reviews
       WHERE property_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 20`,
      [pid]
    );
    const masked = rows.map((r) => ({
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewer: r.reviewer_email.replace(/(.{2}).*(@.*)/, "$1***$2")
    }));
    const [avg] = await query(
      `SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS count FROM property_reviews
       WHERE property_id = ? AND status = 'approved'`,
      [pid]
    );
    res.json({ reviews: masked, summary: avg[0] || { avg_rating: null, count: 0 } });
  } catch (e) {
    next(e);
  }
}

async function confirmListing(req, res, next) {
  try {
    // Public crowd-confirm was able to auto-verify listings — disabled for trust/stability.
    return res.status(503).json({
      message: "Listing confirmation is temporarily unavailable.",
      disabled: true
    });
  } catch (e) {
    next(e);
  }
}

async function getRecommendations(req, res, next) {
  try {
    const bedrooms = req.query.bedrooms;
    const area = req.query.area;
    const listingMode = req.query.listing_mode;
    const clauses = ["is_active = TRUE"];
    const params = [];

    if (bedrooms) {
      clauses.push("bedrooms >= ?");
      params.push(Number(bedrooms));
    }
    if (area && isCanonicalArea(area)) {
      clauses.push("TRIM(COALESCE(canonical_area, '')) = TRIM(?)");
      params.push(area);
    }
    if (listingMode === "for_rent") {
      clauses.push("LOWER(COALESCE(property_status, '')) LIKE '%rent%'");
    } else if (listingMode === "for_sale") {
      clauses.push("LOWER(COALESCE(property_status, '')) LIKE '%sale%'");
    } else {
      clauses.push("LOWER(COALESCE(property_status, '')) LIKE '%sale%'");
    }

    const where = `WHERE ${clauses.join(" AND ")}`;
    const orderScraped = dialect === "postgres" ? "scraped_at DESC NULLS LAST" : "scraped_at DESC";
    const [rows] = await query(
      `SELECT * FROM properties ${where}
       ORDER BY
         ${verifiedTierSql()} ASC,
         ${orderScraped},
         COALESCE(price_usd, price) DESC
       LIMIT 24`,
      params
    );
    const medians = await getAreaMedians();
    const recommendations = rows
      .map((row) => sanitizePropertyForClient(enrichWithHmlo(applyUsdPricing(row), medians), req.user))
      .filter((row) => isPlausibleListingPrice(row) && hasImages(row))
      .slice(0, 6);
    res.json({ recommendations });
  } catch (e) {
    next(e);
  }
}

module.exports = { postReview, getReviews, confirmListing, getRecommendations };
