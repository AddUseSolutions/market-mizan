import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STRINGS = {
  en: {
    heroTitle: "Find your right match with Mizan",
    heroPill: "The trusted portal to find, compare, and navigate the real estate market in Ethiopia",
    heroSub: "Compare all real estate rental and sale listings in Addis Ababa here.",
    heroUploadCta: "Upload your listing",
    rent: "Rent",
    buy: "Buy",
    sell: "Sell",
    findAgent: "Find agent",
    manageRentals: "Manage rentals",
    verifyListing: "Verify listing",
    advertise: "Advertise",
    getHelp: "Get help",
    signIn: "Sign in",
    signOut: "Sign out",
    navListings: "Listings",
    navAbout: "About",
    navMap: "Map",
    navUpload: "Upload listing",
    navAdmin: "Admin",
    navLogin: "Login",
    navAccount: "Account",
    navLogout: "Logout",
    menu: "Menu",
    closeMenu: "Close menu",
    openMenu: "Open menu",
    searchBuy: "Buy",
    searchRent: "Rent",
    searchForRent: "For rent",
    searchForSale: "For sale",
    searchPlaceholder: "Search by area or keyword",
    searchType: "Type",
    searchCity: "City",
    searchArea: "Area",
    searchBedrooms: "Bedrooms",
    searchSubmit: "Search",
    moreFilters: "More filters",
    popularSearches: "Popular searches",
    quickFilter1: "2 bed · Bole · ETB 80–100k",
    quickFilter2: "3 bed · rent",
    quickFilter3: "Apartments · for sale",
    properties: "Properties",
    listingsCount: "listings",
    loadingListings: "Loading listings…",
    sort: "Sort",
    sortRecommended: "Recommended",
    sortLatest: "Newest",
    sortPriceAsc: "Price: low to high",
    sortPriceDesc: "Price: high to low",
    sortSize: "Size",
    showingPerPage: "Showing {n} per page",
    pageOf: "Page {page} of {total}",
    noListingsTitle: "No listings match these filters",
    noListingsBody: "Try switching between buy and rent, clearing filters, or run a fresh scraper sync.",
    recommendations: "Recommended for you",
    recommendationsSub: "Hand-picked matches — fewer clicks to decide.",
    verified: "Verified",
    newBadge: "New",
    beds: "Beds",
    baths: "Baths",
    cardDisclaimer: "All listings belong to their respective platforms ({source}).",
    viewDetails: "View details",
    language: "Language",
    hmloHigh: "High",
    hmloMedium: "Medium",
    hmloLow: "Low",
    hmloOpportunity: "Opportunity",
    hmloTitle: "Price guidance vs neighborhood",
    confirmListing: "Confirm listing is still active",
    leaveReview: "Leave a review",
    suppliers: "Related services",
    whatsapp: "WhatsApp",
    footerLead: "Your property aggregator for Addis Ababa — clear listings, one calm place to browse.",
    trustSection: "Why Market Mizan",
    trustCompare: "Compare in one place",
    trustCompareSub: "Listings from trusted Ethiopian portals — side by side.",
    trustSource: "Original source linked",
    trustSourceSub: "Every listing links back to the broker platform.",
    trustVerify: "Community verification",
    trustVerifySub: "Confirm listings and see verified badges.",
    priceOnRequest: "Price on request",
    lastSynced: "Updated {date}",
    unverifiedNotice: "Aggregated listing — verify details on the original platform before you visit or pay.",
    viewOnSource: "View on {source}"
  },
  am: {
    heroTitle: "በሚዛን ትክክለኛውን መኖሪያ ያግኙ",
    heroPill: "በኢትዮጵያ የንግድ ቤት ገበያ ለመፈለግ፣ ለማወዳደር እና ለመนำደግ የታመነ መድረክ",
    heroSub: "በአዲስ አበባ የሚገኙ ሁሉንም የኪራይ እና የሽያጭ ዝርዝሮችን እዚህ ያወዳድሩ።",
    heroUploadCta: "ንግድዎን ይስቀሉ",
    rent: "ኪራይ",
    buy: "ግዛ",
    sell: "ሽጥ",
    findAgent: "ወኪል ፈልግ",
    manageRentals: "ኪራይ አስተዳድር",
    verifyListing: "ዝርዝር አረጋግጥ",
    advertise: "ማስተዋወቂያ",
    getHelp: "እገዛ",
    signIn: "ግባ",
    signOut: "ውጣ",
    navListings: "ዝርዝሮች",
    navAbout: "ስለ እኛ",
    navMap: "ካርታ",
    navUpload: "ዝርዝር ስቀል",
    navAdmin: "አስተዳዳሪ",
    navLogin: "ግባ",
    navAccount: "መለያ",
    navLogout: "ውጣ",
    menu: "ምናሌ",
    closeMenu: "ምናሌ ዝጋ",
    openMenu: "ምናሌ ክፈት",
    searchBuy: "ግዛ",
    searchRent: "ኪራይ",
    searchForRent: "ለኪራይ",
    searchForSale: "ለሽያጭ",
    searchPlaceholder: "በአካባቢ ወይም ቁልፍ ቃል ፈልግ",
    searchType: "አይነት",
    searchCity: "ከተማ",
    searchArea: "አካባቢ",
    searchBedrooms: "መኝታ",
    searchSubmit: "ፈልግ",
    moreFilters: "ተጨማሪ ማጣሪያ",
    popularSearches: "ተወዳጅ ፍለጋዎች",
    quickFilter1: "2 መኝታ · ቦሌ · ETB 80–100k",
    quickFilter2: "3 መኝታ · ኪራይ",
    quickFilter3: "አፓርታማ · ለሽያጭ",
    properties: "ንግድ ቤቶች",
    listingsCount: "ዝርዝሮች",
    loadingListings: "ዝርዝሮች በመጫን ላይ…",
    sort: "ደርድር",
    sortRecommended: "የተመከሩ",
    sortLatest: "አዲስ",
    sortPriceAsc: "ዋጋ፡ ከዝቅ ወደ ከፍ",
    sortPriceDesc: "ዋጋ፡ ከከፍ ወደ ዝቅ",
    sortSize: "ስፋት",
    showingPerPage: "በገጽ {n}",
    pageOf: "ገጽ {page} ከ {total}",
    noListingsTitle: "ምንም ዝርዝር አልተገኘም",
    noListingsBody: "በግዛ/ኪራይ ለውጥ፣ ማጣሪያዎችን ያጽዱ ወይም አዲስ ስክራይ መስራት ይሞክሩ።",
    recommendations: "ለእርስዎ የተመከሩ",
    recommendationsSub: "የተመረጡ ዝርዝሮች — ወደ ውሳኔ በአንድ ጠባብ መንገድ።",
    verified: "የተረጋገጠ",
    newBadge: "አዲስ",
    beds: "መኝታ",
    baths: "መታጠቢያ",
    cardDisclaimer: "ሁሉም ዝርዝሮች የራሳቸው መድረኮች ({source}) ናቸው።",
    viewDetails: "ዝርዝር ይመልከቱ",
    language: "ቋንቋ",
    hmloHigh: "ከፍ",
    hmloMedium: "መካከለኛ",
    hmloLow: "ዝቅ",
    hmloOpportunity: "እድል",
    hmloTitle: "ዋጋ መመሪያ ከአካባቢ ጋር",
    confirmListing: "ዝርዝሩ አሁንም ገበያ ላይ መሆኑን ያረጋግጡ",
    leaveReview: "ግምገማ ይስጡ",
    suppliers: "ተዛማጅ አገልግሎቶች",
    whatsapp: "WhatsApp",
    footerLead: "የአዲስ አበባ ንግድ ቤት-aggregator — ግልጽ ዝርዝሮች በአንድ ቦታ።",
    trustSection: "ለምን Market Mizan",
    trustCompare: "በአንድ ቦታ ያወዳድሩ",
    trustCompareSub: "ከታመኑ የኢትዮጵያ መድረኮች ዝርዝሮች በአንድ ቦታ.",
    trustSource: "ዋናው መድረክ ተገናኝቷል",
    trustSourceSub: "ሁሉም ዝርዝር ወደ ወኪል መድረክ ይያያዋል.",
    trustVerify: "የማህበረሰብ ማረጋገጫ",
    trustVerifySub: "ዝርዝሮችን ያረጋግጡ እና የተረጋገጡ ምልክቶችን ይመልከቱ.",
    priceOnRequest: "ዋጋ በጥያቄ",
    lastSynced: "ተዘምኗል {date}",
    unverifiedNotice: "የተሰብሰበ ዝርዝር — ከመጎብኘትዎ ወይም ከመክፈልዎ በፊት በዋናው መድረክ ላይ ያረጋግጡ.",
    viewOnSource: "በ{source} ላይ ይመልከቱ"
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const stored = localStorage.getItem("mmizan_lang");
    return stored === "am" ? "am" : "en";
  });

  useEffect(() => {
    document.documentElement.lang = lang === "am" ? "am" : "en";
  }, [lang]);

  const t = useMemo(() => {
    const dict = STRINGS[lang] || STRINGS.en;
    return (key, vars) => {
      let text = dict[key] || STRINGS.en[key] || key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    };
  }, [lang]);

  function setLanguage(next) {
    const safe = next === "am" ? "am" : "en";
    setLang(safe);
    localStorage.setItem("mmizan_lang", safe);
    document.documentElement.lang = safe === "am" ? "am" : "en";
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

export function LanguageToggle({ compact = false }) {
  const { lang, setLanguage, t } = useLanguage();
  return (
    <div className={`lang-switch${compact ? " lang-switch--compact" : ""}`} role="group" aria-label={t("language")}>
      <button
        type="button"
        className={`lang-switch-btn${lang === "en" ? " lang-switch-btn--active" : ""}`}
        onClick={() => setLanguage("en")}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <button
        type="button"
        className={`lang-switch-btn${lang === "am" ? " lang-switch-btn--active" : ""}`}
        onClick={() => setLanguage("am")}
        aria-pressed={lang === "am"}
      >
        አማ
      </button>
    </div>
  );
}
