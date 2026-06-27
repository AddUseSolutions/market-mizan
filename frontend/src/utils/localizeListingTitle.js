/** Common property listing phrases → localized labels (titles stay scraped in English). */
const PHRASES = {
  am: [
    [/apartment/gi, "አፓርትመንት"],
    [/villa/gi, "ቪላ"],
    [/house/gi, "ቤት"],
    [/bedroom/gi, "አልጋ"],
    [/bathroom/gi, "መታጠቢያ"],
    [/for sale/gi, "ለሽያጭ"],
    [/for rent/gi, "ለኪራይ"],
    [/to let/gi, "ለኪራይ"],
    [/commercial/gi, "ንግድ"],
    [/land/gi, "መሬት"],
    [/studio/gi, "ስቱዲዮ"],
    [/office/gi, "ቢሮ"],
    [/building/gi, "ሕንፃ"],
  ],
  ar: [
    [/apartment/gi, "شقة"],
    [/villa/gi, "فيلا"],
    [/house/gi, "منزل"],
    [/bedroom/gi, "غرفة نوم"],
    [/bathroom/gi, "حمام"],
    [/for sale/gi, "للبيع"],
    [/for rent/gi, "للإيجار"],
    [/to let/gi, "للإيجار"],
    [/commercial/gi, "تجاري"],
    [/land/gi, "أرض"],
    [/studio/gi, "استوديو"],
    [/office/gi, "مكتب"],
    [/building/gi, "مبنى"],
  ],
  om: [
    [/apartment/gi, "apaartimentii"],
    [/villa/gi, "villaa"],
    [/house/gi, "mana"],
    [/bedroom/gi, "kutaa ciisichaa"],
    [/for sale/gi, "gurgurtaa"],
    [/for rent/gi, "kireeffachuuf"],
    [/to let/gi, "kireeffachuuf"],
    [/commercial/gi, "daldalaa"],
    [/land/gi, "lafa"],
    [/studio/gi, "istuudiyoo"],
    [/office/gi, "waajjira"],
    [/building/gi, "gamoo"],
  ],
};

export function localizeListingTitle(title, lang) {
  const text = String(title || "").trim();
  if (!text || lang === "en") return text;
  const rules = PHRASES[lang];
  if (!rules) return text;
  return rules.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}
