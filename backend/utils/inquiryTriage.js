const CATEGORIES = [
  "serious_buyer",
  "serious_tenant",
  "listing_owner",
  "partnership",
  "support",
  "spam",
  "other"
];

const SPAM_RE =
  /\b(viagra|crypto|bitcoin|seo\s+service|guest\s+post|backlink|lottery|casino|forex|whatsapp\s+group|million\s+dollars|work\s+from\s+home|unsubscribe)\b/i;
const SERIOUS_RE =
  /\b(rent|rental|buy|sale|sell|viewing|visit|apartment|house|villa|birr|etb|available|tenant|landlord|mm\d{3,})\b/i;

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function recommendationFor(score, category) {
  if (category === "spam" || score < 40) return "discard";
  if (score >= 70 && category !== "other") return "reply";
  return "review";
}

function heuristicTriage({ subject = "", body = "" }) {
  const text = `${subject}\n${body}`;
  let score = 45;
  if (SPAM_RE.test(text)) score -= 35;
  if (SERIOUS_RE.test(text)) score += 30;
  if ((text.match(/https?:\/\//gi) || []).length >= 3) score -= 15;
  if (text.trim().length < 12) score -= 20;
  score = clampScore(score);
  let category = "other";
  if (SPAM_RE.test(text)) category = "spam";
  else if (/\b(rent|rental|tenant)\b/i.test(text)) category = "serious_tenant";
  else if (/\b(buy|sale|sell|purchase)\b/i.test(text)) category = "serious_buyer";
  else if (/\b(my listing|landlord|list my)\b/i.test(text)) category = "listing_owner";
  return {
    category,
    score,
    recommendation: recommendationFor(score, category),
    reason: "Rule-based score. The model was not available.",
    suggestedReply: ""
  };
}

function parseTriageJson(text) {
  if (!text) return null;
  let cleaned = String(text).trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) cleaned = fenced[1].trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let parsed;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
  const category = CATEGORIES.includes(parsed.category) ? parsed.category : "other";
  const score = clampScore(parsed.score);
  const recommendation = ["discard", "review", "reply"].includes(parsed.recommendation)
    ? parsed.recommendation
    : recommendationFor(score, category);
  return {
    category,
    score,
    recommendation,
    reason: String(parsed.reason || "").slice(0, 400),
    suggestedReply: String(parsed.suggestedReply || parsed.suggested_reply || "").slice(0, 1200)
  };
}

async function classifyInquiry(message, chatCompletion) {
  const fallback = heuristicTriage(message);
  if (typeof chatCompletion !== "function") return fallback;
  const raw = await chatCompletion(
    [
      "You sort inbound mail for Market Mizan, a property site in Addis Ababa.",
      "Return ONLY JSON with keys category, score, recommendation, reason, suggestedReply.",
      "category is one of: serious_buyer, serious_tenant, listing_owner, partnership, support, spam, other.",
      "score is 0-100. 100 means a real person asking about a home, a viewing, or their own listing. 0 means spam or junk.",
      "recommendation is discard, review, or reply. Use reply only when score is at least 70 and the person asked something a human can answer.",
      "suggestedReply is a short English reply from Market Mizan. Do not invent prices, viewing times, or availability. If it should not be answered, leave suggestedReply empty.",
      "reason is one sentence."
    ].join(" "),
    JSON.stringify({
      from: message.fromEmail || "",
      name: message.fromName || "",
      subject: message.subject || "",
      body: String(message.body || "").slice(0, 4000)
    }),
    500
  );
  return parseTriageJson(raw) || fallback;
}

module.exports = {
  CATEGORIES,
  classifyInquiry,
  heuristicTriage,
  parseTriageJson,
  recommendationFor
};
