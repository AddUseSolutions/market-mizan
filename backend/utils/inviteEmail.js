const { resolvePublicFrontendUrl } = require("./userInvites");

function buildInviteEmail({ firstName, email, agencyName, setPasswordUrl, role }) {
  const siteUrl = resolvePublicFrontendUrl();
  const greeting = firstName ? `Hello ${firstName}` : "Hello";
  const isBroker = String(role || "").includes("BROKER");
  const headline = isBroker
    ? "Your trusted broker account is ready"
    : "Your Market Mizan account is ready";
  const intro = isBroker
    ? `Welcome to <strong>Market Mizan</strong>. Your agency${agencyName ? ` <strong>${agencyName}</strong>` : ""} has been set up as a verified broker partner. Listings you publish go live immediately — no waiting for manual review.`
    : "Welcome to <strong>Market Mizan</strong>. Your account has been created and is ready to activate.";

  const text = [
    `${greeting},`,
    "",
    headline,
    "",
    isBroker
      ? `Your agency${agencyName ? ` (${agencyName})` : ""} is configured as a trusted broker on Market Mizan.`
      : "Your Market Mizan account has been created.",
    "",
    "Set your password (link valid 72 hours):",
    setPasswordUrl,
    "",
    "After signing in you can access your dashboard at " + siteUrl + "/dashboard",
    "",
    "— Market Mizan Team",
    siteUrl
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
          <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;color:#ffffff;">${headline}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${greeting},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${intro}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#64748b;">Account email</p>
          <p style="margin:0 0 24px;font-size:15px;font-weight:700;">${email}</p>
          <a href="${setPasswordUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:999px;">Set your password</a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">This secure link expires in <strong>72 hours</strong>. If the button does not work, copy this URL into your browser:<br><span style="word-break:break-all;color:#2563eb;">${setPasswordUrl}</span></p>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;line-height:1.6;">
          Market Mizan · Verified property listings in Addis Ababa<br>
          <a href="${siteUrl}" style="color:#2563eb;text-decoration:none;">${siteUrl.replace(/^https?:\/\//, "")}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject: isBroker
      ? "Welcome to Market Mizan — activate your broker account"
      : "Welcome to Market Mizan — set your password",
    text,
    html
  };
}

module.exports = { buildInviteEmail };
