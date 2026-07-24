/**
 * Google Analytics 4 + Search Console helpers.
 * Set VITE_GA_MEASUREMENT_ID and optional VITE_GOOGLE_SITE_VERIFICATION at build time.
 */

const gaId = typeof import.meta !== "undefined" ? import.meta.env.VITE_GA_MEASUREMENT_ID : "";
const siteVerification =
  typeof import.meta !== "undefined" ? import.meta.env.VITE_GOOGLE_SITE_VERIFICATION : "";

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
  }

  gtag("js", new Date());
  gtag("config", gaId, { send_page_view: false });
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

/** Call on every client-side route change. */
export function trackPageView(path, title) {
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
