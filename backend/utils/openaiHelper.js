const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function chatCompletion(systemPrompt, userPrompt, maxTokens = 400) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.3
    })
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

function stripMarkdownFence(text) {
  if (!text) return "";
  let cleaned = String(text).trim();
  const fenced = cleaned.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenced) cleaned = fenced[1].trim();
  return cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function parseTitleSuggestions(text) {
  const cleaned = stripMarkdownFence(text);
  if (!cleaned) return [];

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || "").trim()).filter(isValidTitleSuggestion);
    }
    if (parsed && Array.isArray(parsed.titles)) {
      return parsed.titles.map((item) => String(item || "").trim()).filter(isValidTitleSuggestion);
    }
    if (typeof parsed === "string" && isValidTitleSuggestion(parsed)) return [parsed];
  } catch {
    // fall through to line parsing
  }

  return cleaned
    .split("\n")
    .map((line) => line.replace(/^[-*\d.]+\s*/, "").replace(/^["']|["']$/g, "").trim())
    .filter(isValidTitleSuggestion)
    .slice(0, 5);
}

function isValidTitleSuggestion(title) {
  const value = String(title || "").trim();
  if (!value) return false;
  if (/^```/.test(value)) return false;
  if (/^json$/i.test(value)) return false;
  return value.length >= 8 && value.length <= 160;
}

async function suggestTitles(facts) {
  const prompt = JSON.stringify(facts);
  const text = await chatCompletion(
    "You write factual Ethiopian real estate listing titles. Max 120 chars. No marketing fluff. Return ONLY a JSON array of 3 title strings, no markdown fences.",
    prompt,
    300
  );
  if (!text) return null;
  const parsed = parseTitleSuggestions(text);
  return parsed.length ? parsed : null;
}

async function suggestDescription(facts) {
  const text = await chatCompletion(
    "Write a factual property summary for Market Mizan (max 120 words). Only hard facts. No copied marketing text. English.",
    JSON.stringify(facts),
    350
  );
  return text;
}

module.exports = { suggestTitles, suggestDescription, chatCompletion };
