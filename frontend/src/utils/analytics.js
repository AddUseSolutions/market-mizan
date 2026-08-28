/**
 * Google Analytics 4 + Search Console helpers.
 * Measurement ID is embedded in index.html; env can override for staging.
 */

const DEFAULT_GA_ID = "G-7NESMN9BJZ";
const gaId =
  (typeof import.meta !== "undefined" && import.meta.env.VITE_GA_MEASUREMENT_ID) || DEFAULT_GA_ID;
const siteVerification =
  typeof import.meta !== "undefined" ? import.meta.env.VITE_GOOGLE_SITE_VERIFICATION : "";

/** First route page_view is already sent by gtag('config') in index.html. */
let skippedInitialPageView = false;

function ensureGtag() {
  if (!gaId || typeof window === "undefined") return null;
  if (typeof window.gtag === "function") return window.gtag;

  window.dataLayer = window.dataLayer || [];
  function gtag(...args) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;

  if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${gaId}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);
    gtag("js", new Date());
    gtag("config", gaId);
  }

  return gtag;
}

export function initAnalytics() {
  if (typeof document === "undefined") return;

  if (siteVerification) {
    let el = document.head.querySelector('meta[name="google-site-verification"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "google-site-verification");
      document.head.appendChild(el);
    }
    el.setAttribute("content", siteVerification);
  }

  ensureGtag();
}

/** Call on every client-side route change (SPA). Skips the first load — already counted by config. */
export function trackPageView(path, title) {
  if (!skippedInitialPageView) {
    skippedInitialPageView = true;
    return;
  }
  const gtag = ensureGtag();
  if (!gtag) return;
  gtag("event", "page_view", {
    page_path: path || window.location.pathname + window.location.search,
    page_title: title || document.title,
    page_location: window.location.href
  });
}

export function isAnalyticsEnabled() {
  return Boolean(gaId);
}
