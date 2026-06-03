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

async function suggestTitles(facts) {
  const fallback = null;
  const prompt = JSON.stringify(facts);
  const text = await chatCompletion(
    "You write factual Ethiopian real estate listing titles. Max 120 chars. No marketing fluff. Return JSON array of 3 title strings.",
    prompt,
    300
  );
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).slice(0, 5);
  } catch {
    return text.split("\n").map((l) => l.replace(/^[-*\d.]+\s*/, "").trim()).filter(Boolean).slice(0, 5);
  }
  return fallback;
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
