const { resolvePublicFrontendUrl } = require("./userInvites");

function resolveAdminNotifyEmail() {
  return (
    process.env.ADMIN_NOTIFY_EMAIL ||
    process.env.CONTACT_TO_EMAIL ||
    "hello@mmizan.com"
  );
}

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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  resolveAdminNotifyEmail,
  buildSubmissionReviewEmail
};
