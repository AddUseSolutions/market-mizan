const { query, dialect } = require("../db/connection");
const { clampString } = require("./sanitize");
const { isCanonicalArea } = require("./canonicalAreas");
const { getEtbPerUsd, todayIsoDate, etbToUsd, validateListingPriceInput } = require("./fxRate");
const { sendMail, resolveAdminNotifyEmail } = require("./mail");
const { buildSubmissionReviewEmail } = require("./submissionNotificationEmail");
const { invalidateCache } = require("./memoryCache");

function invalidateDashboardStats() {
  invalidateCache("dashboard-stats-full");
}

function numOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function listingModeFromStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("sale")) return "for_sale";
  return "for_rent";
}

/**
 * Validate and normalize an admin/owner edit of a listing submission.
 * Returns { ok:false, message } or { ok:true, fields }.
 */
function normalizeListingDraft(body, { existing = {} } = {}) {
  const title = clampString(body.title ?? existing.title, 255);
  const listingMode = clampString(body.listingMode ?? body.listing_mode ?? existing.listing_mode, 30);
  const propertyType = clampString(body.propertyType ?? body.property_type ?? existing.property_type, 80);
  const category = clampString(body.propertyCategory ?? body.property_category ?? existing.property_category, 30);
  const locationArea = clampString(body.locationArea ?? body.location_area ?? existing.location_area, 255);
  const locationCity = clampString(body.locationCity ?? body.location_city ?? existing.location_city ?? "Addis Ababa", 100);
  const availableFrom = clampString(body.availableFrom ?? body.available_from ?? existing.available_from, 30);
  const contactName = clampString(body.contactName ?? body.contact_name ?? existing.contact_name, 120);
  const contactPhone = clampString(body.contactPhone ?? body.contact_phone ?? existing.contact_phone, 40);
  const notes = clampString(body.notes ?? body.description ?? existing.notes ?? existing.description_original, 4000);
  const priceEtb = numOrNull(body.priceEtb ?? body.price_etb ?? body.price ?? existing.price_etb ?? existing.price);
  const sizeM2 = numOrNull(body.sizeM2 ?? body.size_m2 ?? existing.size_m2);
  const landArea = numOrNull(body.landAreaM2 ?? body.land_area_m2 ?? existing.land_area_m2);
  const bedrooms = numOrNull(body.bedrooms ?? existing.bedrooms ?? existing.rooms);
  const bathrooms = numOrNull(body.bathrooms ?? existing.bathrooms);
  const kitchens = numOrNull(body.kitchens ?? existing.kitchens);
  const livingRooms = numOrNull(body.livingRooms ?? body.living_rooms ?? existing.living_rooms);
  const maidBedrooms = numOrNull(body.maidBedrooms ?? body.maid_bedrooms ?? existing.maid_bedrooms);
  const maidBathrooms = numOrNull(body.maidBathrooms ?? body.maid_bathrooms ?? existing.maid_bathrooms);
  const latitude = numOrNull(body.latitude ?? existing.latitude);
  const longitude = numOrNull(body.longitude ?? existing.longitude);

  if (!title) return { ok: false, message: "Title is required." };
  if (!listingMode || !["for_rent", "for_sale"].includes(listingMode)) {
    return { ok: false, message: "Listing mode must be for rent or for sale." };
  }
  if (!propertyType) return { ok: false, message: "Property type is required." };
  if (!priceEtb || priceEtb <= 0) return { ok: false, message: "Price (ETB) must be a positive number." };
  const priceCheck = validateListingPriceInput({ priceEtb, listingMode });
  if (!priceCheck.ok) return { ok: false, message: priceCheck.message };
  if (!sizeM2 || sizeM2 <= 0) return { ok: false, message: "Living size (m²) is required." };
  if (!locationArea || !isCanonicalArea(locationArea)) {
    return { ok: false, message: "Please choose a valid Addis sub-city." };
  }
  if (latitude == null || longitude == null) return { ok: false, message: "Please set the map pin." };

  const etbPerUsd = getEtbPerUsd();
  return {
    ok: true,
    fields: {
      title,
      listing_mode: listingMode,
      property_type: propertyType,
      property_category: category || null,
      price: priceEtb,
      price_etb: priceEtb,
      price_usd: etbToUsd(priceEtb, etbPerUsd),
      fx_rate_etb_usd: etbPerUsd,
      fx_rate_date: todayIsoDate(),
      size_m2: sizeM2,
      land_area_m2: landArea,
      rooms: bedrooms ?? existing.rooms ?? 0,
      bedrooms,
      bathrooms,
      kitchens,
      living_rooms: livingRooms,
      maid_bedrooms: maidBedrooms,
      maid_bathrooms: maidBathrooms,
      location_area: locationArea,
      location_city: locationCity || "Addis Ababa",
      available_from: availableFrom || existing.available_from || "now",
      contact_name: contactName || existing.contact_name,
      contact_phone: contactPhone || null,
      notes: notes || null,
      description_original: notes || null,
      latitude,
      longitude
    }
  };
}

async function updateSubmissionDraft(id, fields) {
  await query(
    `UPDATE listing_submissions SET
      title = ?, listing_mode = ?, property_type = ?, property_category = ?,
      price = ?, price_etb = ?, price_usd = ?, fx_rate_etb_usd = ?, fx_rate_date = ?,
      size_m2 = ?, land_area_m2 = ?, rooms = ?, bedrooms = ?, bathrooms = ?,
      kitchens = ?, living_rooms = ?, maid_bedrooms = ?, maid_bathrooms = ?,
      location_area = ?, location_city = ?, available_from = ?,
      contact_name = ?, contact_phone = ?, notes = ?, description_original = ?,
      latitude = ?, longitude = ?
     WHERE id = ? AND status = 'pending'`,
    [
      fields.title, fields.listing_mode, fields.property_type, fields.property_category,
      fields.price, fields.price_etb, fields.price_usd, fields.fx_rate_etb_usd, fields.fx_rate_date,
      fields.size_m2, fields.land_area_m2, fields.rooms, fields.bedrooms, fields.bathrooms,
      fields.kitchens, fields.living_rooms, fields.maid_bedrooms, fields.maid_bathrooms,
      fields.location_area, fields.location_city, fields.available_from,
      fields.contact_name, fields.contact_phone, fields.notes, fields.description_original,
      fields.latitude, fields.longitude,
      id
    ]
  );
}

async function claimListingsForUser(user) {
  if (!user?.id || !user?.email) return;
  await query(
    `UPDATE properties
     SET owner_id = ?
     WHERE owner_id IS NULL
       AND property_id IN (
         SELECT published_property_id FROM listing_submissions
         WHERE status = 'published'
           AND published_property_id IS NOT NULL
           AND LOWER(contact_email) = LOWER(?)
       )`,
    [user.id, user.email]
  );
}

async function findOwnerIdByEmail(email) {
  if (!email) return null;
  const [rows] = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND is_active = TRUE LIMIT 1`, [
    email
  ]);
  return rows[0]?.id ?? null;
}

async function notifyAdminOfSubmission(submission) {
  const emailContent = buildSubmissionReviewEmail(submission);
  const mailResult = await sendMail({
    to: resolveAdminNotifyEmail(),
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html
  });
  if (!mailResult.ok) console.warn("Revision notice email failed:", mailResult.reason);
  return mailResult;
}

/**
 * Owner edit of a live listing. Stores a pending submission (or updates the open one)
 * so an admin must approve before the public listing changes.
 */
async function submitListingRevision(user, propertyId, body) {
  await claimListingsForUser(user);
  const [rows] = await query(
    `SELECT * FROM properties WHERE property_id = ? AND is_active = TRUE LIMIT 1`,
    [propertyId]
  );
  if (!rows.length) {
    const err = new Error("Listing not found.");
    err.status = 404;
    throw err;
  }
  const property = rows[0];
  if (Number(property.owner_id) !== Number(user.id)) {
    const err = new Error("You can edit only your own listings.");
    err.status = 403;
    throw err;
  }

  const [subs] = await query(
    `SELECT * FROM listing_submissions
     WHERE published_property_id = ? AND status = 'published'
     ORDER BY id DESC LIMIT 1`,
    [propertyId]
  );
  const publishedSub = subs[0] || {};
  const existing = {
    ...publishedSub,
    title: property.title,
    listing_mode: listingModeFromStatus(property.property_status),
    property_type: property.property_type,
    price_etb: property.price_etb,
    price: property.price_etb,
    size_m2: property.property_size_m2,
    land_area_m2: property.land_area_m2,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    location_area: property.canonical_area || property.location_area,
    location_city: property.location_city,
    latitude: property.latitude,
    longitude: property.longitude,
    notes: property.description_original || property.description,
    description_original: property.description_original || property.description,
    contact_name: publishedSub.contact_name || user.firstName || user.email,
    contact_email: publishedSub.contact_email || user.email,
    contact_phone: publishedSub.contact_phone || null,
    available_from: publishedSub.available_from || "now",
    images: publishedSub.images || property.images
  };

  const draft = normalizeListingDraft(body, { existing });
  if (!draft.ok) {
    const err = new Error(draft.message);
    err.status = 400;
    throw err;
  }

  const [pending] = await query(
    `SELECT id FROM listing_submissions
     WHERE status = 'pending' AND published_property_id = ?
     ORDER BY id DESC LIMIT 1`,
    [propertyId]
  );

  if (pending[0]?.id) {
    await updateSubmissionDraft(pending[0].id, {
      ...draft.fields,
      contact_name: draft.fields.contact_name || existing.contact_name
    });
    invalidateDashboardStats();
    return { submissionId: pending[0].id, updated: true };
  }

  const imagesJson =
    typeof existing.images === "string" ? existing.images : JSON.stringify(existing.images || []);
  const f = draft.fields;
  const insertSql = `INSERT INTO listing_submissions
     (title, listing_mode, property_type, property_category, price, size_m2, land_area_m2,
      rooms, bedrooms, bathrooms, kitchens, living_rooms, maid_bedrooms, maid_bathrooms,
      available_from, contact_name, contact_email, contact_phone, latitude, longitude, notes,
      price_etb, price_usd, fx_rate_etb_usd, fx_rate_date, description_original,
      location_area, location_city, images, status, published_property_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`;
  const params = [
    f.title, f.listing_mode, f.property_type, f.property_category, f.price, f.size_m2, f.land_area_m2,
    f.rooms, f.bedrooms, f.bathrooms, f.kitchens, f.living_rooms, f.maid_bedrooms, f.maid_bathrooms,
    f.available_from, f.contact_name || existing.contact_name, existing.contact_email, f.contact_phone,
    f.latitude, f.longitude, f.notes,
    f.price_etb, f.price_usd, f.fx_rate_etb_usd, f.fx_rate_date, f.description_original,
    f.location_area, f.location_city, imagesJson, propertyId
  ];

  let submissionId = null;
  if (dialect === "postgres") {
    const [inserted] = await query(`${insertSql} RETURNING id`, params);
    submissionId = inserted[0]?.id ?? null;
  } else {
    const [result] = await query(insertSql, params);
    submissionId = result?.insertId ?? null;
  }

  invalidateDashboardStats();
  await notifyAdminOfSubmission({
    id: submissionId,
    title: f.title,
    listing_mode: f.listing_mode,
    property_type: f.property_type,
    location_area: f.location_area,
    location_city: f.location_city,
    price_etb: f.price_etb,
    price_usd: f.price_usd,
    contact_name: f.contact_name || existing.contact_name,
    contact_email: existing.contact_email,
    contact_phone: f.contact_phone
  });

  return { submissionId, updated: false };
}

async function listOwnedListings(user) {
  await claimListingsForUser(user);
  const [rows] = await query(
    `SELECT p.id, p.property_id, p.title, p.location_area, p.canonical_area, p.property_status,
            p.price_etb, p.verification_status, p.is_active,
            s.id AS pending_submission_id
     FROM properties p
     LEFT JOIN listing_submissions s
       ON s.published_property_id = p.property_id AND s.status = 'pending'
     WHERE p.owner_id = ? AND p.is_active = TRUE
     ORDER BY p.last_seen DESC
     LIMIT 100`,
    [user.id]
  );
  return rows;
}

module.exports = {
  normalizeListingDraft,
  updateSubmissionDraft,
  claimListingsForUser,
  findOwnerIdByEmail,
  submitListingRevision,
  listOwnedListings,
  listingModeFromStatus
};
