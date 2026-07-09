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

async function sendMail({ to, subject, text, html }) {
  const transporter = buildTransporter();
  if (!transporter) {
    return { ok: false, reason: "SMTP not configured" };
  }
  const from =
    process.env.MAIL_FROM ||
    (process.env.SMTP_USER ? `Market Mizan <${process.env.SMTP_USER}>` : "Market Mizan <hello@mmizan.com>");
  try {
    await transporter.sendMail({ from, to, subject, text, html });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error?.message || "SMTP send failed" };
  }
}

function resolveAdminNotifyEmail() {
  return (
    process.env.ADMIN_NOTIFY_EMAIL ||
    process.env.CONTACT_TO_EMAIL ||
    "hello@mmizan.com"
  );
}

module.exports = { sendMail, buildTransporter, resolveAdminNotifyEmail };
