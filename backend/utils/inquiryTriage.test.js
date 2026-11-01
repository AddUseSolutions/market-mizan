const { test } = require("node:test");
const assert = require("node:assert/strict");
const { heuristicTriage, parseTriageJson, classifyInquiry } = require("./inquiryTriage");

test("spam mail scores low and is marked discard", () => {
  const result = heuristicTriage({
    subject: "SEO guest post offer",
    body: "Buy backlinks and guest post packages. Click here https://a.example https://b.example https://c.example"
  });
  assert.equal(result.category, "spam");
  assert.equal(result.recommendation, "discard");
  assert.ok(result.score < 40);
});

test("a viewing request scores as worth a look", () => {
  const result = heuristicTriage({
    subject: "Apartment in Bole",
    body: "Hello, I want to rent this apartment and book a viewing this week. My budget is 45000 ETB."
  });
  assert.ok(result.score >= 70);
  assert.equal(result.recommendation, "reply");
});

test("model JSON is accepted and a fence is ignored", () => {
  const parsed = parseTriageJson(
    '```json\n{"category":"serious_tenant","score":88,"recommendation":"reply","reason":"Asks for a viewing.","suggestedReply":"Thanks, we will confirm."}\n```'
  );
  assert.equal(parsed.category, "serious_tenant");
  assert.equal(parsed.score, 88);
  assert.equal(parsed.suggestedReply, "Thanks, we will confirm.");
});

test("classify falls back when the model returns nothing", async () => {
  const result = await classifyInquiry(
    { subject: "Hello", body: "I want to buy a house in Yeka." },
    async () => null
  );
  assert.ok(result.score >= 70);
  assert.equal(result.recommendation, "reply");
});
