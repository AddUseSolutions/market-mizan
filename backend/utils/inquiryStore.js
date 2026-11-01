const { query, dialect } = require("../db/connection");
const { classifyInquiry } = require("./inquiryTriage");
const { chatCompletion } = require("./openaiHelper");
const { sendMail, resolveTeamInbox, PUBLIC_MAILBOX } = require("./mail");

async function ensureMailTriageSchema() {
  if (dialect === "postgres") {
    await query(`
      CREATE TABLE IF NOT EXISTS mail_triage (
        id SERIAL PRIMARY KEY,
        source VARCHAR(30) NOT NULL,
        external_id VARCHAR(255) UNIQUE,
        from_email VARCHAR(254),
        from_name VARCHAR(200),
        subject VARCHAR(500),
        body TEXT,
        category VARCHAR(40),
        score INT,
        recommendation VARCHAR(20),
        reason TEXT,
        suggested_reply TEXT,
        whatsapp_sent BOOLEAN NOT NULL DEFAULT FALSE,
        auto_replied BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    return;
  }
  await query(`
    CREATE TABLE IF NOT EXISTS mail_triage (
      id INT AUTO_INCREMENT PRIMARY KEY,
      source VARCHAR(30) NOT NULL,
      external_id VARCHAR(255) UNIQUE,
      from_email VARCHAR(254),
      from_name VARCHAR(200),
      subject VARCHAR(500),
      body TEXT,
      category VARCHAR(40),
      score INT,
      recommendation VARCHAR(20),
      reason TEXT,
      suggested_reply TEXT,
      whatsapp_sent BOOLEAN NOT NULL DEFAULT FALSE,
      auto_replied BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function alertText(row) {
  const lines = [
    "Market Mizan Anfrage",
    `Score: ${row.score}/100 — ${row.recommendation === "discard" ? "eher ausmisten" : row.recommendation === "reply" ? "seriös" : "prüfen"}`,
    `Kategorie: ${row.category}`,
    `Von: ${row.from_name || "—"} <${row.from_email || "—"}>`,
    `Betreff: ${row.subject || "—"}`,
    "",
    String(row.body || "").slice(0, 500),
    "",
    row.suggested_reply ? `Antwortvorschlag:\n${row.suggested_reply}` : "Kein Antwortvorschlag.",
    "",
    "Testphase: es wurde noch nicht geantwortet."
  ];
  return lines.join("\n").slice(0, 3500);
}

async function sendWhatsAppAlert(text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = String(process.env.WHATSAPP_ALERT_TO || "251941881133").replace(/\D/g, "");
  if (!token || !phoneId || !to) return { ok: false, reason: "WhatsApp is not configured" };
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text }
      })
    });
    if (!res.ok) return { ok: false, reason: `WhatsApp ${res.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error?.message || "WhatsApp failed" };
  }
}

async function notifyTeam(row) {
  const text = alertText(row);
  const whatsapp = await sendWhatsAppAlert(text);
  if (!whatsapp.ok) {
    await sendMail({
      to: resolveTeamInbox(),
      subject: `Anfrage ${row.score}/100 — ${row.category}`,
      text,
      replyTo: row.from_email || undefined
    });
  }
  return whatsapp.ok;
}

function autoReplyEnabled() {
  return /^(1|true|yes)$/i.test(process.env.INQUIRY_AUTO_REPLY || "");
}

async function maybeAutoReply(row) {
  if (!autoReplyEnabled()) return false;
  if (row.recommendation !== "reply" || row.score < 80 || !row.suggested_reply || !row.from_email) return false;
  const sent = await sendMail({
    to: row.from_email,
    from: process.env.MAIL_FROM || `Market Mizan <${PUBLIC_MAILBOX}>`,
    subject: row.subject ? `Re: ${row.subject}` : "Market Mizan",
    text: row.suggested_reply
  });
  return Boolean(sent.ok);
}

async function recordInquiry(input) {
  const externalId = String(input.externalId || "").slice(0, 255);
  if (externalId) {
    const [existing] = await query("SELECT id FROM mail_triage WHERE external_id = ? LIMIT 1", [externalId]);
    if (existing?.[0]) return { duplicate: true, id: existing[0].id };
  }
  const triage = await classifyInquiry(
    {
      fromEmail: input.fromEmail,
      fromName: input.fromName,
      subject: input.subject,
      body: input.body
    },
    chatCompletion
  );
  const row = {
    source: String(input.source || "inbox").slice(0, 30),
    external_id: externalId || null,
    from_email: String(input.fromEmail || "").slice(0, 254) || null,
    from_name: String(input.fromName || "").slice(0, 200) || null,
    subject: String(input.subject || "").slice(0, 500) || null,
    body: String(input.body || "").slice(0, 8000),
    category: triage.category,
    score: triage.score,
    recommendation: triage.recommendation,
    reason: triage.reason,
    suggested_reply: triage.suggestedReply
  };
  const insertSql =
    dialect === "postgres"
      ? `INSERT INTO mail_triage (
      source, external_id, from_email, from_name, subject, body,
      category, score, recommendation, reason, suggested_reply
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
      : `INSERT INTO mail_triage (
      source, external_id, from_email, from_name, subject, body,
      category, score, recommendation, reason, suggested_reply
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    row.source,
    row.external_id,
    row.from_email,
    row.from_name,
    row.subject,
    row.body,
    row.category,
    row.score,
    row.recommendation,
    row.reason,
    row.suggested_reply
  ];
  const [inserted] = await query(insertSql, params);
  const id = dialect === "postgres" ? inserted?.[0]?.id : inserted?.insertId;
  row.id = id;
  const whatsappSent = await notifyTeam(row);
  const autoReplied = await maybeAutoReply(row);
  if (id && (whatsappSent || autoReplied)) {
    await query("UPDATE mail_triage SET whatsapp_sent = ?, auto_replied = ? WHERE id = ?", [
      whatsappSent,
      autoReplied,
      id
    ]).catch(() => {});
  }
  return row;
}

async function listRecentInquiries(limit = 50) {
  const n = Math.min(100, Math.max(1, Number(limit) || 50));
  const [rows] = await query(
    `SELECT id, source, from_email, from_name, subject, category, score, recommendation, reason,
            suggested_reply, whatsapp_sent, auto_replied, created_at
     FROM mail_triage ORDER BY id DESC LIMIT ${n}`
  );
  return rows || [];
}

module.exports = {
  ensureMailTriageSchema,
  recordInquiry,
  listRecentInquiries,
  sendWhatsAppAlert
};
