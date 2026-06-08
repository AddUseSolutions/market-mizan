const nodemailer = require("nodemailer");
const { query } = require("../db/connection");

const DEFAULT_CONTACT_TO = "mmizan@add-use.ch";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
    // Hostpoint & most providers: 587 = STARTTLS (not implicit SSL)
    requireTLS: !secure && port === 587,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
  });
}

async function postContact(req, res, next) {
  try {
    const to = process.env.CONTACT_TO_EMAIL || DEFAULT_CONTACT_TO;

    const transporter = buildTransporter();
    if (!transporter) {
      return res.status(503).json({
        message:
          "Email is not configured (set SMTP_URL or SMTP_HOST and credentials)."
      });
    }
    if (
      process.env.SMTP_HOST &&
      (!process.env.SMTP_USER || !process.env.SMTP_PASS)
    ) {
      return res.status(503).json({
        message:
          "SMTP is incomplete: set SMTP_USER and SMTP_PASS (or use SMTP_URL)."
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      message,
      propertyId,
      propertyTitle,
      detailUrl,
      propertyAddress
    } = req.body || {};

    const fn = typeof firstName === "string" ? firstName.trim() : "";
    const ln = typeof lastName === "string" ? lastName.trim() : "";
    const em = typeof email === "string" ? email.trim() : "";
    const ph = typeof phone === "string" ? phone.trim() : "";
    const msg = typeof message === "string" ? message.trim() : "";

    if (!fn || fn.length > 80) {
      return res.status(400).json({ message: "Please enter a valid first name." });
    }
    if (!ln || ln.length > 80) {
      return res.status(400).json({ message: "Please enter a valid last name." });
    }
    if (!em || em.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (ph.length > 40) {
      return res.status(400).json({ message: "Phone number is too long." });
    }
    if (msg.length > 10000) {
      return res.status(400).json({ message: "Message is too long." });
    }

    const pid = propertyId != null ? String(propertyId).slice(0, 120) : "";
    const ptitle =
      typeof propertyTitle === "string" ? propertyTitle.trim().slice(0, 300) : "";
    let purl = typeof detailUrl === "string" ? detailUrl.trim().slice(0, 2000) : "";
    if (purl && !/^https?:\/\//i.test(purl)) purl = "";
    const paddr =
      typeof propertyAddress === "string" ? propertyAddress.trim().slice(0, 500) : "";

    const subject = `[Market Mizan] Inquiry${ptitle ? `: ${ptitle}` : pid ? ` (#${pid})` : ""}`;

    const textLines = [
      "New contact request via Market Mizan",
      "",
      `Listing: ${ptitle || "—"}`,
      `Property ID: ${pid || "—"}`,
      paddr ? `Address: ${paddr}` : null,
      purl ? `Link: ${purl}` : null,
      "",
      `Name: ${fn} ${ln}`,
      `Email: ${em}`,
      ph ? `Phone: ${ph}` : null,
      "",
      "Message:",
      msg || "(empty)",
      ""
    ].filter(Boolean);

    const html = `
      <h2>New contact request</h2>
      <p><strong>Listing:</strong> ${escapeHtml(ptitle || "—")}<br/>
      <strong>Property ID:</strong> ${escapeHtml(pid || "—")}<br/>
      ${paddr ? `<strong>Address:</strong> ${escapeHtml(paddr)}<br/>` : ""}
      ${purl ? `<strong>Link:</strong> <a href="${escapeHtml(purl)}">${escapeHtml(purl)}</a><br/>` : ""}
      </p>
      <p><strong>Name:</strong> ${escapeHtml(fn)} ${escapeHtml(ln)}<br/>
      <strong>Email:</strong> ${escapeHtml(em)}<br/>
      ${ph ? `<strong>Phone:</strong> ${escapeHtml(ph)}<br/>` : ""}
      </p>
      <h3>Message</h3>
      <pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(msg || "(empty)")}</pre>
    `;

    const from =
      process.env.MAIL_FROM ||
      process.env.SMTP_USER ||
      `"Market Mizan" <noreply@localhost>`;

    await transporter.sendMail({
      from,
      to,
      replyTo: em,
      subject,
      text: textLines.join("\n"),
      html
    });

    const leadType =
      typeof req.body?.leadType === "string" && req.body.leadType.trim()
        ? req.body.leadType.trim().slice(0, 30)
        : /holistic services/i.test(msg)
          ? "holistic"
          : "property";
    const serviceLabel =
      typeof req.body?.serviceLabel === "string" ? req.body.serviceLabel.trim().slice(0, 120) : null;

    await query(
      `INSERT INTO holistic_leads (
        lead_type, service_label, first_name, last_name, email, phone, message,
        property_id, property_title, detail_url, property_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        leadType,
        serviceLabel,
        fn,
        ln,
        em,
        ph || null,
        msg || null,
        pid || null,
        ptitle || null,
        purl || null,
        paddr || null
      ]
    ).catch((err) => console.warn("holistic_leads insert:", err.message));

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

module.exports = { postContact };
