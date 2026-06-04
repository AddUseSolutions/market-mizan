const { query, dialect } = require("../db/connection");
const { getEtbPerUsd, todayIsoDate, etbToUsd } = require("../utils/fxRate");
const { slugPropertyId, clampString } = require("../utils/sanitize");
const { computePricePerSqmUsd, computeHmloScore, fetchNeighborhoodStats, groupNeighborhoodStats } = require("../utils/hmlo");

function listingModeToStatus(mode) {
  return String(mode).toLowerCase() === "for_sale" ? "For Sale" : "For Rent";
}

function typeLabel(type) {
  return String(type || "property").replace(/_/g, " ");
}

async function getSubmissions(req, res, next) {
  try {
    const status = req.query.status || "pending";
    const [rows] = await query(
      `SELECT * FROM listing_submissions WHERE status = ? ORDER BY created_at DESC LIMIT 100`,
      [status]
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

async function publishSubmission(req, res, next) {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    const isPaid = Boolean(body.isPaid);
    const publisherType = clampString(body.publisherType || "landlord", 20) || "landlord";

    const [rows] = await query(`SELECT * FROM listing_submissions WHERE id = ? LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ message: "Submission not found." });
    const sub = rows[0];
    if (sub.status === "published") {
      return res.status(400).json({ message: "Already published.", propertyId: sub.published_property_id });
    }

    const propertyId = slugPropertyId("verified");
    const etbPerUsd = getEtbPerUsd();
    const priceEtb = Number(sub.price_etb || sub.price);
    const priceUsd = sub.price_usd != null ? Number(sub.price_usd) : etbToUsd(priceEtb, etbPerUsd);
    const fxDate = sub.fx_rate_date || todayIsoDate();
    let images = sub.images;
    if (typeof images === "string") {
      try { images = JSON.parse(images); } catch { images = []; }
    }
    images = Array.isArray(images) ? images : [];

    const description =
      sub.ai_description ||
      sub.notes ||
      `${listingModeToStatus(sub.listing_mode)} ${typeLabel(sub.property_type)} in ${sub.location_area || "Addis Ababa"}.`;

    const pps = computePricePerSqmUsd({ price_usd: priceUsd, property_size_m2: sub.size_m2 });

    await query(
      `INSERT INTO properties (
        property_id, source_website, source_name, title, price, price_etb, price_usd,
        fx_rate_etb_usd, fx_rate_date, currency, property_size_m2, land_area_m2,
        bedrooms, bathrooms, property_type, property_status, furnished, features, images,
        latitude, longitude, location_city, location_area, location_district, description,
        is_scraped, listing_origin, verification_status, is_paid, publisher_type,
        verified_at, price_per_sqm_usd, hmlo_score, is_active, first_seen, last_seen, scraped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, TRUE, NOW(), NOW(), NOW())`,
      [
        propertyId, "market-mizan.com", "Market Mizan", sub.title, priceEtb, priceEtb, priceUsd,
        sub.fx_rate_etb_usd || etbPerUsd, fxDate, "USD", sub.size_m2, sub.land_area_m2,
        sub.bedrooms || sub.rooms, sub.bathrooms, typeLabel(sub.property_type),
        listingModeToStatus(sub.listing_mode), false, "[]", JSON.stringify(images.slice(0, 6)),
        sub.latitude, sub.longitude, sub.location_city || "Addis Ababa", sub.location_area,
        sub.location_area, description, false, "verified", "verified", isPaid, publisherType,
        pps, pps ? "medium" : null
      ]
    );

    await query(
      `INSERT INTO price_history (property_id, price_etb, price_usd) VALUES (?, ?, ?)`,
      [propertyId, priceEtb, priceUsd]
    );

    await query(
      `UPDATE listing_submissions SET status = 'published', reviewed_at = NOW(), reviewed_by = ?,
       published_property_id = ?, rejection_reason = NULL WHERE id = ?`,
      [req.user.id, propertyId, id]
    );

    res.json({ ok: true, propertyId });
  } catch (e) {
    next(e);
  }
}

async function rejectSubmission(req, res, next) {
  try {
    const id = Number(req.params.id);
    const reason = clampString(req.body?.reason || "Does not meet guidelines.", 500);
    await query(
      `UPDATE listing_submissions SET status = 'rejected', reviewed_at = NOW(), reviewed_by = ?, rejection_reason = ? WHERE id = ?`,
      [req.user.id, reason, id]
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

async function verifyProperty(req, res, next) {
  try {
    const { property_id } = req.params;
    const body = req.body || {};
    const isPaid = body.isPaid != null ? Boolean(body.isPaid) : undefined;
    const publisherType = body.publisherType ? clampString(body.publisherType, 20) : undefined;

    const sets = ["verification_status = 'verified'", "listing_origin = 'verified'", "verified_at = NOW()", "last_verified_check = NOW()"];
    const params = [];
    if (isPaid !== undefined) {
      sets.push("is_paid = ?");
      params.push(isPaid);
    }
    if (publisherType) {
      sets.push("publisher_type = ?");
      params.push(publisherType);
    }
    params.push(property_id);

    await query(`UPDATE properties SET ${sets.join(", ")} WHERE property_id = ?`, params);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

async function deactivateProperty(req, res, next) {
  try {
    await query(`UPDATE properties SET is_active = FALSE WHERE property_id = ?`, [req.params.property_id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

async function getNeighborhoodStats(req, res, next) {
  try {
    const rows = await fetchNeighborhoodStats(query, dialect);
    res.json(groupNeighborhoodStats(rows));
  } catch (e) {
    next(e);
  }
}

async function runMaintenance(req, res, next) {
  try {
    const maxDays = Number(process.env.CRAWLED_MAX_AGE_DAYS || 365);
    if (dialect === "postgres") {
      await query(
        `UPDATE properties SET is_active = FALSE
         WHERE is_active = TRUE AND listing_origin = 'crawled'
           AND first_seen < NOW() - ($1 || ' days')::interval`,
        [maxDays]
      );
    } else {
      await query(
        `UPDATE properties SET is_active = FALSE
         WHERE is_active = TRUE AND listing_origin = 'crawled'
           AND first_seen < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [maxDays]
      );
    }
    res.json({ ok: true, deactivatedOlderThanDays: maxDays });
  } catch (e) {
    next(e);
  }
}

async function countCrawledListings() {
  const [rows] = await query(
    `SELECT COUNT(*) AS n FROM properties WHERE listing_origin = 'crawled'`
  );
  return Number(rows[0]?.n ?? 0);
}

async function resetCrawledForRescrape(req, res, next) {
  try {
    const mode = String(req.body?.mode || "soft").toLowerCase();
    const crawledTotal = await countCrawledListings();

    if (mode === "hard") {
      const idsSubquery = `SELECT property_id FROM properties WHERE listing_origin = 'crawled'`;
      await query(`DELETE FROM price_history WHERE property_id IN (${idsSubquery})`);
      await query(`DELETE FROM property_reviews WHERE property_id IN (${idsSubquery})`);
      await query(`DELETE FROM listing_confirmations WHERE property_id IN (${idsSubquery})`);
      await query(`DELETE FROM user_favorites WHERE property_id IN (${idsSubquery})`);
      await query(`DELETE FROM listing_crowd_flags WHERE property_id IN (${idsSubquery})`);
      const [result] = await query(`DELETE FROM properties WHERE listing_origin = 'crawled'`);
      const deleted = result?.rowCount ?? result?.affectedRows ?? crawledTotal;
      return res.json({
        ok: true,
        mode: "hard",
        crawledTotal,
        deleted,
        hint: "Run scraper with forceRescrape=true next."
      });
    }

    const [result] = await query(
      `UPDATE properties
       SET scraped_at = NULL,
           last_scrape_error_at = NULL,
           last_scrape_error_type = NULL
       WHERE listing_origin = 'crawled'`
    );
    const updated = result?.rowCount ?? result?.affectedRows ?? crawledTotal;
    res.json({
      ok: true,
      mode: "soft",
      crawledTotal,
      updated,
      hint: "Run scraper with forceRescrape=true (SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS=0 for one run)."
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getSubmissions,
  publishSubmission,
  rejectSubmission,
  verifyProperty,
  deactivateProperty,
  getNeighborhoodStats,
  runMaintenance,
  resetCrawledForRescrape
};
