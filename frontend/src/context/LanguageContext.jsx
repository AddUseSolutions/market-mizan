import { createContext, useContext, useMemo, useState } from "react";

const STRINGS = {
  en: {
    heroTitle: "Find your right match with Mizan",
    heroPill: "The trusted portal to find, compare, and navigate the real estate market in Ethiopia",
    heroSub: "Compare all real estate rental and sale listings in Addis Ababa here.",
    rent: "Rent",
    buy: "Buy",
    sell: "Sell",
    findAgent: "Find agent",
    verified: "Verified",
    hmloHigh: "Price: high vs area",
    hmloMedium: "Price: typical for area",
    hmloLow: "Price: below area average",
    hmloOpportunity: "Opportunity",
    confirmListing: "Confirm listing is still active",
    leaveReview: "Leave a review",
    suppliers: "Related services",
    recommendations: "Recommended for you",
    language: "Language"
  },
  am: {
    heroTitle: "በሚዛን ትክክለኛውን መ residence ያግኙ",
    heroPill: "በኢትዮጵያ የንግድ ቤት ገበያ ለመፈለግ፣ ለማወዳደር እና ለመนำደግ የታመነ መድረክ",
    heroSub: "በአዲስ አበባ የሚገኙ ሁሉንም የኪራይ እና የሽያጭ ዝርዝሮችን እዚህ ያወዳድሩ።",
    rent: "ኪራይ",
    buy: "ግዛ",
    sell: "ሽጥ",
    findAgent: "ወኪል ፈልግ",
    verified: "የተረጋገጠ",
    hmloHigh: "ዋጋ፡ ከአካባቢው ከፍተኛ",
    hmloMedium: "ዋጋ፡ ለአካባቢው መደበኛ",
    hmloLow: "ዋጋ፡ ከአማካኝ ዝቅ",
    hmloOpportunity: "እድል",
    confirmListing: "ዝርዝሩ አሁንም ገበያ ላይ መሆኑን ያረጋግጡ",
    leaveReview: "ግምገማ ይስጡ",
    suppliers: "ተዛማጅ አገልግሎቶች",
    recommendations: "ለእርስዎ የተመከሩ",
    language: "ቋንቋ"
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("mmizan_lang") || "en");
  const t = useMemo(() => {
    const dict = STRINGS[lang] || STRINGS.en;
    return (key) => dict[key] || STRINGS.en[key] || key;
  }, [lang]);

  function setLanguage(next) {
    setLang(next);
    localStorage.setItem("mmizan_lang", next);
    document.documentElement.lang = next === "am" ? "am" : "en";
  }

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage requires LanguageProvider");
  return ctx;
}

export function LanguageToggle() {
  const { lang, setLanguage, t } = useLanguage();
  return (
    <button type="button" className="lang-toggle" onClick={() => setLanguage(lang === "en" ? "am" : "en")} aria-label={t("language")}>
      {lang === "en" ? "አማ" : "EN"}
    </button>
  );
}
