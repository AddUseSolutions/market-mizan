const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const sent = [];
const queries = [];

function stub(relPath, exports) {
  const file = path.join(__dirname, relPath);
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
}

stub("../db/connection.js", {
  dialect: "postgres",
  query: async (sql, params = []) => {
    queries.push({ sql, params });
    if (/SELECT id FROM properties WHERE property_id/.test(sql)) return [[{ id: 4321 }]];
    return [[]];
  }
});
stub("./mail.js", {
  PUBLIC_MAILBOX: "hello@mmizan.com",
  sendMail: async (msg) => {
    sent.push(msg);
    return { ok: true };
  }
});

process.env.PUBLIC_SITE_URL = "https://mmizan.com";
const { sendListingApprovedEmail, sendSubmissionReceivedEmail, ensurePublishedSubmissionsVerified } = require("./publishListing");

test("submission confirmation goes to the submitter from hello@mmizan.com", async () => {
  sent.length = 0;
  const result = await sendSubmissionReceivedEmail(
    {
      title: "Villa <Yeka>",
      listing_mode: "for_sale",
      property_type: "Villa",
      location_area: "Yeka",
      price_etb: 25000000,
      contact_name: "Abel Kebede",
      contact_email: " abel@example.com "
    },
    57,
    4
  );
  assert.equal(result.ok, true);
  assert.equal(sent.length, 1);
  const [mail] = sent;
  assert.equal(mail.to, "abel@example.com");
  assert.equal(mail.from, "Market Mizan <hello@mmizan.com>");
  assert.equal(mail.replyTo, "hello@mmizan.com");
  assert.match(mail.subject, /We received your listing — Villa <Yeka>/);
  assert.match(mail.text, /Hello Abel,/);
  assert.match(mail.text, /Submission number: #57/);
  assert.match(mail.text, /Photos: 4 photos/);
  assert.match(mail.text, /Type: Villa · For sale/);
  assert.match(mail.html, /In review/);
  assert.match(mail.html, /Villa &lt;Yeka&gt;/);
  assert.doesNotMatch(mail.html, /<Yeka>/);
});

test("no confirmation without a valid contact address", async () => {
  sent.length = 0;
  const result = await sendSubmissionReceivedEmail({ title: "x", contact_email: "" }, 1, 0);
  assert.equal(result.ok, false);
  assert.equal(sent.length, 0);
});

test("approval email goes from hello@mmizan.com with ref and verified note", async () => {
  sent.length = 0;
  const result = await sendListingApprovedEmail(
    { title: "3BR Apartment in Bole", contact_name: "Sara Tesfaye", contact_email: "sara@example.com", location_area: "Bole" },
    "verified-abc123"
  );
  assert.equal(result.ok, true);
  assert.equal(result.listingRef, "MM4321");
  assert.equal(sent.length, 1);
  const [mail] = sent;
  assert.equal(mail.to, "sara@example.com");
  assert.equal(mail.from, "Market Mizan <hello@mmizan.com>");
  assert.equal(mail.replyTo, "hello@mmizan.com");
  assert.match(mail.subject, /approved and verified — MM4321/);
  assert.match(mail.text, /Hello Sara,/);
  assert.match(mail.text, /https:\/\/mmizan\.com\/property\/MM4321/);
  assert.match(mail.html, /✔ Verified/);
});

test("no email without a valid contact address", async () => {
  sent.length = 0;
  const result = await sendListingApprovedEmail({ title: "x", contact_email: "not-an-email" }, "verified-x");
  assert.equal(result.ok, false);
  assert.equal(sent.length, 0);
});

test("verified backfill targets published submissions only", async () => {
  queries.length = 0;
  await ensurePublishedSubmissionsVerified();
  const sql = queries[0].sql;
  assert.match(sql, /SET verification_status = 'verified'/);
  assert.match(sql, /status = 'published'/);
});
