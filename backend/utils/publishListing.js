const { query } = require("../db/connection");
const { getEtbPerUsd, todayIsoDate, etbToUsd, validateListingPriceInput } = require("./fxRate");
const { slugPropertyId, clampString } = require("./sanitize");
const { computePricePerSqmUsd } = require("./hmlo");
const { resolveCanonicalAreaOrDefault } = require("./canonicalAreas");
const { insertPriceHistory } = require("./priceHistory");
const { persistInlineImages } = require("./mediaStore");
const { formatListingRef } = require("./listingRef");
const { sendMail, PUBLIC_MAILBOX } = require("./mail");
const { buildSubmissionApprovedEmail, buildSubmissionReceivedEmail } = require("./submissionNotificationEmail");

function listingModeToStatus(mode) {
  return String(mode).toLowerCase() === "for_sale" ? "For Sale" : "For Rent";
}

function typeLabel(type) {
  return String(type || "property").replace(/_/g, " ");
}

function parseImages(raw) {
  let images = raw;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [];
    }
  }
  return Array.isArray(images) ? images : [];
}

async function publishVerifiedListing(
  sub,
  { ownerId = null, publisherType = "broker", isPaid = false, sourceName = "Market Mizan" } = {}
) {
  const propertyId = slugPropertyId("verified");
  const etbPerUsd = getEtbPerUsd();
  const priceEtb = Number(sub.price_etb || sub.price);
  const priceCheck = validateListingPriceInput({
    priceEtb,
    listingMode: sub.listing_mode,
    propertyStatus: listingModeToStatus(sub.listing_mode)
  });
  if (!priceCheck.ok) {
    const err = new Error(priceCheck.message);
    err.status = 400;
    throw err;
  }
  const priceUsd = sub.price_usd != null ? Number(sub.price_usd) : etbToUsd(priceEtb, etbPerUsd);
  const fxDate = sub.fx_rate_date || todayIsoDate();
  const images = await persistInlineImages(parseImages(sub.images));

  const descriptionOriginal =
    sub.description_original ||
    sub.notes ||
    `${listingModeToStatus(sub.listing_mode)} ${typeLabel(sub.property_type)} in ${sub.location_area || "Addis Ababa"}.`;
  const descriptionSummary = sub.description_summary || sub.ai_description || null;

  const pps = computePricePerSqmUsd({ price_usd: priceUsd, property_size_m2: sub.size_m2 });
  const canonicalArea = resolveCanonicalAreaOrDefault({
    location_area: sub.location_area,
    location_district: sub.location_area,
    title: sub.title,
    description: descriptionOriginal
  });

  await query(
    `INSERT INTO properties (
      property_id, source_website, source_name, title, price, price_etb, price_usd,
      fx_rate_etb_usd, fx_rate_date, currency, property_size_m2, land_area_m2,
      bedrooms, bathrooms, property_type, property_status, furnished, features, images,
      latitude, longitude, location_city, location_area, location_district, canonical_area,
      description, description_original, description_summary,
      is_scraped, listing_origin, verification_status, is_paid, publisher_type, owner_id,
      verified_at, price_per_sqm_usd, hmlo_score, is_active, first_seen, last_seen, scraped_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, TRUE, NOW(), NOW(), NOW())`,
    [
      propertyId,
      "market-mizan.com",
      sourceName,
      sub.title,
      priceEtb,
      priceEtb,
      priceUsd,
      sub.fx_rate_etb_usd || etbPerUsd,
      fxDate,
      "ETB",
      sub.size_m2,
      sub.land_area_m2,
      sub.bedrooms || sub.rooms,
      sub.bathrooms,
      typeLabel(sub.property_type),
      listingModeToStatus(sub.listing_mode),
      false,
      "[]",
      JSON.stringify(images.slice(0, 6)),
      sub.latitude,
      sub.longitude,
      sub.location_city || "Addis Ababa",
      sub.location_area,
      sub.location_area,
      canonicalArea,
      descriptionOriginal,
      descriptionOriginal,
      descriptionSummary,
      false,
      "verified",
      "verified",
      isPaid,
      clampString(publisherType, 20) || "broker",
      ownerId,
      pps,
      pps ? "medium" : null
    ]
  );

  await insertPriceHistory(propertyId, priceEtb, priceUsd);

  return propertyId;
}

function submitterAddress(submission) {
  const to = String(submission?.contact_email || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ? to : null;
}

function sendFromPublicMailbox(to, email) {
  return sendMail({
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
    from: `Market Mizan <${PUBLIC_MAILBOX}>`,
    replyTo: PUBLIC_MAILBOX
  });
}

/** Email the submitter (from hello@mmizan.com) that the listing is approved and verified. */
async function sendListingApprovedEmail(submission, propertyId) {
  const to = submitterAddress(submission);
  if (!to) return { ok: false, reason: "No valid contact email" };

  const [rows] = await query("SELECT id FROM properties WHERE property_id = ? LIMIT 1", [propertyId]).catch(() => [[]]);
  const listingRef = formatListingRef(rows[0]?.id);
  const result = await sendFromPublicMailbox(to, buildSubmissionApprovedEmail({ submission, propertyId, listingRef }));
  if (!result.ok) console.warn(`Approval email to ${to} failed:`, result.reason);
  return { ...result, to, listingRef };
}

/** Email the submitter (from hello@mmizan.com) that the listing was received and is in review. */
async function sendSubmissionReceivedEmail(submission, submissionId, photoCount) {
  const to = submitterAddress(submission);
  if (!to) return { ok: false, reason: "No valid contact email" };

  const result = await sendFromPublicMailbox(to, buildSubmissionReceivedEmail({ submission, submissionId, photoCount }));
  if (!result.ok) console.warn(`Submission confirmation to ${to} failed:`, result.reason);
  return { ...result, to };
}

/** Listings published from approved submissions must carry the verified badge. */
async function ensurePublishedSubmissionsVerified() {
  await query(
    `UPDATE properties
     SET verification_status = 'verified', listing_origin = 'verified', verified_at = COALESCE(verified_at, NOW())
     WHERE property_id IN (
       SELECT published_property_id FROM listing_submissions
       WHERE status = 'published' AND published_property_id IS NOT NULL
     )
     AND (verification_status IS NULL OR verification_status <> 'verified')`
  );
}

module.exports = {
  publishVerifiedListing,
  sendListingApprovedEmail,
  sendSubmissionReceivedEmail,
  ensurePublishedSubmissionsVerified,
  listingModeToStatus,
  typeLabel
};
