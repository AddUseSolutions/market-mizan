import assert from "node:assert/strict";
import { heuristicTriage, prependInquiryScore } from "./inquiryScore.js";

const spam = heuristicTriage({
  subject: "SEO guest post offer",
  body: "Buy backlinks and guest post packages. Click here https://a.example https://b.example https://c.example"
});
assert.equal(spam.category, "spam");
assert.equal(spam.recommendation, "discard");
assert.ok(spam.score < 40);

const viewing = heuristicTriage({
  subject: "Apartment in Bole",
  body: "Hello, I want to rent this apartment and book a viewing this week. My budget is 45000 ETB."
});
assert.ok(viewing.score >= 70);
assert.equal(viewing.recommendation, "reply");
assert.equal(viewing.category, "serious_tenant");

const message = "Hello Mizan Team,\n\nI am interested in the property";
const withScore = prependInquiryScore(message, viewing);
assert.ok(withScore.startsWith(`Score: ${viewing.score}/100 — seriös`));
assert.ok(withScore.includes("Kategorie: serious_tenant"));
assert.ok(withScore.endsWith(message));

console.log("inquiryScore.test.js OK");
