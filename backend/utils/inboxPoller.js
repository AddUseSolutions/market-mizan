const { simpleParser } = require("mailparser");
const { recordInquiry } = require("./inquiryStore");

let running = false;

function mailboxConfig() {
  if (/^(0|false|no)$/i.test(process.env.IMAP_POLL || "")) return null;
  const user = process.env.IMAP_USER || process.env.SMTP_USER;
  const pass = process.env.IMAP_PASS || process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return {
    host: process.env.IMAP_HOST || "imap.mail.hostpoint.ch",
    port: Number(process.env.IMAP_PORT || 993),
    secure: process.env.IMAP_SECURE !== "false",
    auth: { user, pass },
    logger: false
  };
}

async function pollInboxOnce() {
  const config = mailboxConfig();
  if (!config || running) return { skipped: true };
  running = true;
  let client;
  try {
    const { ImapFlow } = require("imapflow");
    client = new ImapFlow(config);
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const uids = await client.search({ seen: false, since });
      const batch = (uids || []).slice(-15);
      for (const uid of batch) {
        const message = await client.fetchOne(String(uid), { source: true, envelope: true }, { uid: true });
        if (!message?.source) continue;
        const parsed = await simpleParser(message.source);
        const from = parsed.from?.value?.[0] || {};
        const messageId = parsed.messageId || message.envelope?.messageId || `uid:${uid}`;
        await recordInquiry({
          source: "inbox",
          externalId: String(messageId).slice(0, 255),
          fromEmail: from.address || "",
          fromName: from.name || "",
          subject: parsed.subject || message.envelope?.subject || "",
          body: parsed.text || String(parsed.html || "").replace(/<[^>]+>/g, " ")
        });
      }
      return { checked: batch.length };
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error("Inbox poll failed:", error?.message || error);
    return { error: error?.message || "poll failed" };
  } finally {
    running = false;
    if (client) {
      try {
        await client.logout();
      } catch {
        client.close();
      }
    }
  }
}

function startInboxPoller() {
  if (!mailboxConfig()) {
    console.log("Inbox poller off (set IMAP_POLL and mailbox credentials).");
    return;
  }
  const run = () => pollInboxOnce().catch((error) => console.error("Inbox poll failed:", error?.message || error));
  setTimeout(run, 20_000).unref();
  setInterval(run, 5 * 60 * 1000).unref();
}

module.exports = { pollInboxOnce, startInboxPoller, mailboxConfig };
