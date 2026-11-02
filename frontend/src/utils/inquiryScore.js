/**
 * Same rules as backend/utils/inquiryTriage.js heuristicTriage.
 * Used so the WhatsApp draft can show a score before the server answers.
 */
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

export function heuristicTriage({ subject = "", body = "" }) {
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
    recommendation: recommendationFor(score, category)
  };
}

export function scoreVerdict(recommendation) {
  if (recommendation === "discard") return "eher ausmisten";
  if (recommendation === "reply") return "seriös";
  return "prüfen";
}

/** Keeps the visitor message and puts the test score above it. */
export function prependInquiryScore(message, triage) {
  const head = [
    `Score: ${triage.score}/100 — ${scoreVerdict(triage.recommendation)}`,
    `Kategorie: ${triage.category}`,
    "Testphase: es wurde noch nicht geantwortet.",
    ""
  ].join("\n");
  return `${head}${message}`;
}
