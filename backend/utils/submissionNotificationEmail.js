const { resolvePublicFrontendUrl } = require("./userInvites");
const { resolveAdminNotifyEmail } = require("./mail");

function formatPrice(etb, usd) {
  const parts = [];
  if (etb != null && Number.isFinite(Number(etb))) {
    parts.push(`${Number(etb).toLocaleString("en-US")} ETB`);
  }
  if (usd != null && Number.isFinite(Number(usd))) {
    parts.push(`$${Number(usd).toLocaleString("en-US")}`);
  }
  return parts.length ? parts.join(" / ") : "—";
}

function buildSubmissionReviewEmail(submission) {
  const base = resolvePublicFrontendUrl();
  const submissionId = submission.id;
  const reviewUrl = `${base}/admin?submission=${encodeURIComponent(submissionId)}`;
  const loginUrl = `${base}/login`;

  const title = submission.title || "Untitled listing";
  const area = submission.location_area || submission.location_city || "Addis Ababa";
  const mode = submission.listing_mode || "—";
  const contactName = submission.contact_name || "—";
  const contactEmail = submission.contact_email || "—";
  const contactPhone = submission.contact_phone || "—";
  const priceLabel = formatPrice(submission.price_etb ?? submission.price, submission.price_usd);

  const subject = `New listing to review — ${title}`;

  const text = [
    "A new property listing was submitted and needs admin review.",
    "",
    `Title: ${title}`,
    `Type: ${submission.property_type || "—"} · ${mode}`,
    `Area: ${area}`,
    `Price: ${priceLabel}`,
    `Contact: ${contactName} · ${contactEmail}${contactPhone !== "—" ? ` · ${contactPhone}` : ""}`,
    "",
    "Review, approve, or reject:",
    reviewUrl,
    "",
    "If you are not signed in, log in as admin first:",
    loginUrl,
    "",
    "— Market Mizan"
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
        <tr><td style="background:#0f172a;padding:28px 32px;">
          <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#fbbf24;font-weight:700;">Market Mizan Admin</div>
          <h1 style="margin:12px 0 0;font-size:22px;line-height:1.3;color:#ffffff;">New listing to review</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">A user submitted a listing that is not auto-verified. Please review and approve or reject it.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.6;">
            <tr><td style="padding:6px 0;color:#64748b;width:120px;">Title</td><td style="padding:6px 0;font-weight:700;">${escapeHtml(title)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Type</td><td style="padding:6px 0;">${escapeHtml(submission.property_type || "—")} · ${escapeHtml(mode)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Area</td><td style="padding:6px 0;">${escapeHtml(area)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Price</td><td style="padding:6px 0;">${escapeHtml(priceLabel)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Contact</td><td style="padding:6px 0;">${escapeHtml(contactName)}<br>${escapeHtml(contactEmail)}${contactPhone !== "—" ? `<br>${escapeHtml(contactPhone)}` : ""}</td></tr>
          </table>
          <a href="${reviewUrl}" style="display:inline-block;margin-top:24px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:999px;">Review listing</a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">Sign in as admin if prompted, then approve or reject the submission.<br><a href="${reviewUrl}" style="color:#2563eb;word-break:break-all;">${reviewUrl}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html, reviewUrl };
}

function buildSubmissionApprovedEmail({ submission, propertyId, listingRef }) {
  const base = resolvePublicFrontendUrl();
  const listingUrl = `${base}/property/${encodeURIComponent(listingRef || propertyId)}`;
  const title = submission.title || "Your listing";
  const area = submission.location_area || submission.location_city || "Addis Ababa";
  const greetingName = String(submission.contact_name || "").trim().split(/\s+/)[0] || "there";
  const refLabel = listingRef || propertyId;

  const subject = `Your listing is approved and verified — ${refLabel}`;

  const text = [
    `Hello ${greetingName},`,
    "",
    "Good news: your property listing on Market Mizan has been approved and is now live with a ✔ Verified badge.",
    "",
    `Listing: ${title}`,
    `Area: ${area}`,
    `Listing reference: ${refLabel}`,
    "",
    "View your listing:",
    listingUrl,
    "",
    "To change anything later, sign in with this email address, open the listing, and edit it. Every change is reviewed again before it goes live.",
    "",
    `Please quote the reference ${refLabel} whenever you contact us about this property.`,
    "Questions? Just reply to this email.",
    "",
    "— Market Mizan",
    "hello@mmizan.com"
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
        <tr><td style="background:#0f172a;padding:28px 32px;">
          <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#fbbf24;font-weight:700;">Market Mizan</div>
          <h1 style="margin:12px 0 0;font-size:22px;line-height:1.3;color:#ffffff;">Your listing is approved</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hello ${escapeHtml(greetingName)},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Good news: your property listing has been approved and is now live on Market Mizan with a
            <span style="display:inline-block;background:#16a34a;color:#ffffff;font-size:12px;font-weight:700;padding:2px 10px;border-radius:999px;">✔ Verified</span> badge.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.6;">
            <tr><td style="padding:6px 0;color:#64748b;width:140px;">Listing</td><td style="padding:6px 0;font-weight:700;">${escapeHtml(title)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Area</td><td style="padding:6px 0;">${escapeHtml(area)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Reference</td><td style="padding:6px 0;font-family:monospace;font-weight:700;">${escapeHtml(refLabel)}</td></tr>
          </table>
          <a href="${listingUrl}" style="display:inline-block;margin-top:24px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:999px;">View your listing</a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">Sign in with this email, open the listing, and edit it anytime. Every change is reviewed again before it goes live. Please quote <strong>${escapeHtml(refLabel)}</strong> when you contact us.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">Market Mizan · hello@mmizan.com</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html, listingUrl };
}

function buildSubmissionReceivedEmail({ submission, submissionId, photoCount = 0 }) {
  const base = resolvePublicFrontendUrl();
  const title = submission.title || "Your listing";
  const area = submission.location_area || submission.location_city || "Addis Ababa";
  const greetingName = String(submission.contact_name || "").trim().split(/\s+/)[0] || "there";
  const mode = submission.listing_mode === "for_sale" ? "For sale" : submission.listing_mode === "for_rent" ? "For rent" : submission.listing_mode || "—";
  const typeLabel = [submission.property_type, mode].filter(Boolean).join(" · ");
  const priceLabel = formatPrice(submission.price_etb ?? submission.price, submission.price_usd);
  const submissionLabel = submissionId ? `#${submissionId}` : "—";
  const photosLabel = photoCount > 0 ? `${photoCount} photo${photoCount === 1 ? "" : "s"}` : "No photos";

  const subject = `We received your listing — ${title}`;

  const nextSteps = [
    "Our team reviews the details, photos and map location.",
    "We may call or WhatsApp you if anything needs clarifying.",
    "Once approved, you get a second email with the link to your live listing, its ✔ Verified badge and its Market Mizan reference (MM…)."
  ];

  const text = [
    `Hello ${greetingName},`,
    "",
    "Thank you for listing your property on Market Mizan. We have received your submission and our team will review it shortly.",
    "",
    `Listing: ${title}`,
    `Type: ${typeLabel}`,
    `Area: ${area}`,
    `Price: ${priceLabel}`,
    `Photos: ${photosLabel}`,
    `Submission number: ${submissionLabel}`,
    "",
    "What happens next:",
    ...nextSteps.map((step, i) => `${i + 1}. ${step}`),
    "",
    "Need to change something? Just reply to this email and quote your submission number.",
    "",
    "— Market Mizan",
    "hello@mmizan.com",
    base
  ].join("\n");

  const row = (label, value, extra = "") =>
    `<tr><td style="padding:6px 0;color:#64748b;width:140px;">${label}</td><td style="padding:6px 0;${extra}">${escapeHtml(value)}</td></tr>`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
        <tr><td style="background:#0f172a;padding:28px 32px;">
          <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#fbbf24;font-weight:700;">Market Mizan</div>
          <h1 style="margin:12px 0 0;font-size:22px;line-height:1.3;color:#ffffff;">We received your listing</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hello ${escapeHtml(greetingName)},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Thank you for listing your property on Market Mizan. We have received your submission and our team will review it shortly.
            <span style="display:inline-block;background:#f59e0b;color:#ffffff;font-size:12px;font-weight:700;padding:2px 10px;border-radius:999px;">In review</span></p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.6;">
            ${row("Listing", title, "font-weight:700;")}
            ${row("Type", typeLabel)}
            ${row("Area", area)}
            ${row("Price", priceLabel)}
            ${row("Photos", photosLabel)}
            ${row("Submission no.", submissionLabel, "font-family:monospace;font-weight:700;")}
          </table>
          <h2 style="margin:28px 0 8px;font-size:16px;">What happens next</h2>
          <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#334155;">
            ${nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
          </ol>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">Need to change something? Just reply to this email and quote your submission number <strong>${escapeHtml(submissionLabel)}</strong>.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">Market Mizan · hello@mmizan.com · <a href="${base}" style="color:#94a3b8;">${escapeHtml(base.replace(/^https?:\/\//, ""))}</a></p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function buildSubmissionRejectedEmail({ submission, submissionId, reason }) {
  const base = resolvePublicFrontendUrl();
  const resubmitUrl = `${base}/list-your-property`;
  const title = submission.title || "Your listing";
  const greetingName = String(submission.contact_name || "").trim().split(/\s+/)[0] || "there";
  const submissionLabel = submissionId ? `#${submissionId}` : "—";

  const subject = `Update on your listing — ${title}`;

  const text = [
    `Hello ${greetingName},`,
    "",
    "Thank you for submitting your property to Market Mizan. After reviewing it, we unfortunately cannot publish the listing in its current form.",
    "",
    `Listing: ${title}`,
    `Submission number: ${submissionLabel}`,
    `Reason: ${reason.label}`,
    reason.explanation ? reason.explanation : null,
    reason.note ? `Note from our team: ${reason.note}` : null,
    "",
    "You are welcome to submit the property again with the corrections:",
    resubmitUrl,
    "",
    "Questions? Just reply to this email and quote your submission number.",
    "",
    "— Market Mizan",
    "hello@mmizan.com"
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
        <tr><td style="background:#0f172a;padding:28px 32px;">
          <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#fbbf24;font-weight:700;">Market Mizan</div>
          <h1 style="margin:12px 0 0;font-size:22px;line-height:1.3;color:#ffffff;">Update on your listing</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hello ${escapeHtml(greetingName)},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Thank you for submitting your property to Market Mizan. After reviewing it, we unfortunately cannot publish the listing in its current form.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.6;">
            <tr><td style="padding:6px 0;color:#64748b;width:140px;">Listing</td><td style="padding:6px 0;font-weight:700;">${escapeHtml(title)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">Submission no.</td><td style="padding:6px 0;font-family:monospace;font-weight:700;">${escapeHtml(submissionLabel)}</td></tr>
          </table>
          <div style="margin-top:20px;border-left:4px solid #f59e0b;background:#fffbeb;padding:14px 16px;border-radius:8px;">
            <div style="font-size:14px;font-weight:700;">Reason: ${escapeHtml(reason.label)}</div>
            ${reason.explanation ? `<p style="margin:6px 0 0;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(reason.explanation)}</p>` : ""}
            ${reason.note ? `<p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#334155;"><strong>Note from our team:</strong> ${escapeHtml(reason.note)}</p>` : ""}
          </div>
          <p style="margin:20px 0 0;font-size:15px;line-height:1.6;">You are welcome to submit the property again with the corrections.</p>
          <a href="${resubmitUrl}" style="display:inline-block;margin-top:16px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:999px;">Submit again</a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">Questions? Just reply to this email and quote your submission number <strong>${escapeHtml(submissionLabel)}</strong>.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">Market Mizan · hello@mmizan.com</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  resolveAdminNotifyEmail,
  buildSubmissionReviewEmail,
  buildSubmissionApprovedEmail,
  buildSubmissionReceivedEmail,
  buildSubmissionRejectedEmail
};
