const nodemailer = require("nodemailer");

function buildTransporter() {
  if (process.env.SMTP_URL) {
    return nodemailer.createTransport(process.env.SMTP_URL);
  }
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
  });
}

const PUBLIC_MAILBOX = "hello@mmizan.com";

async function sendMail({ to, subject, text, html, from: fromOverride, replyTo }) {
  const transporter = buildTransporter();
  if (!transporter) {
    return { ok: false, reason: "SMTP not configured" };
  }
  const from =
    fromOverride ||
    process.env.MAIL_FROM ||
    (process.env.SMTP_USER ? `Market Mizan <${process.env.SMTP_USER}>` : `Market Mizan <${PUBLIC_MAILBOX}>`);
  try {
    await transporter.sendMail({ from, to, subject, text, html, ...(replyTo ? { replyTo } : {}) });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error?.message || "SMTP send failed" };
  }
}

/**
 * Team inbox for contact requests, removal requests and admin alerts.
 * Only MAIL_INBOX overrides it; the old CONTACT_TO_EMAIL / ADMIN_NOTIFY_EMAIL are deliberately ignored
 * because Render still carries them with a retired address.
 */
function resolveTeamInbox() {
  return process.env.MAIL_INBOX || PUBLIC_MAILBOX;
}

module.exports = {
  sendMail,
  buildTransporter,
  resolveTeamInbox,
  resolveAdminNotifyEmail: resolveTeamInbox,
  PUBLIC_MAILBOX
};
