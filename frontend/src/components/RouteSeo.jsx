import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import SeoHead from "./SeoHead";
import { trackPageView } from "../utils/analytics";

const ROUTE_SEO = {
  "/": {
    title: "Market Mizan (mmizan) — Homes for rent & sale in Addis Ababa",
    description:
      "Market Mizan (mmizan.com) — compare verified homes for rent and sale in Addis Ababa by neighborhood, price and size."
  },
  "/neighborhoods": {
    title: "Neighborhood map — Market Mizan",
    description: "Explore Addis Ababa neighborhoods and property prices on Market Mizan (mmizan)."
  },
  "/list-your-property": {
    title: "List your property — Market Mizan",
    description: "Publish a verified rental or sale listing on Market Mizan (mmizan.com)."
  },
  "/contact": {
    title: "Contact & find an agent — Market Mizan",
    description: "Contact Market Mizan (mmizan) or find a trusted agent in Addis Ababa."
  },
  "/login": {
    title: "Sign in — Market Mizan",
    description: "Sign in to your Market Mizan account.",
    noIndex: true
  },
  "/dashboard": {
    title: "Dashboard — Market Mizan",
    noIndex: true
  },
  "/admin": {
    title: "Admin — Market Mizan",
    noIndex: true
  },
  "/privacy": {
    title: "Privacy policy — Market Mizan",
    description: "How Market Mizan (mmizan.com) handles your data."
  },
  "/terms": {
    title: "Terms of use — Market Mizan",
    description: "Terms of use for Market Mizan (mmizan.com)."
  },
  "/legal-notice": {
    title: "Legal notice — Market Mizan",
    description: "Legal notice / imprint for Market Mizan."
  },
  "/sitemap": {
    title: "Sitemap — Market Mizan",
    description: "HTML sitemap of Market Mizan pages."
  },
  "/compare": {
    title: "Compare properties — Market Mizan",
    description: "Compare homes side by side on Market Mizan.",
    noIndex: true
  }
};

/**
 * Sets document title/meta and sends GA4 page_view on route changes.
 * Listing detail pages are handled by PropertyDetailPage SeoHead.
 */
export default function RouteSeo() {
  const location = useLocation();
  const path = location.pathname;
  const search = location.search || "";
  const fullPath = `${path}${search}`;
  const isPropertyDetail = path.startsWith("/property/");

  useEffect(() => {
    trackPageView(fullPath, document.title);
  }, [fullPath]);

  if (isPropertyDetail) return null;

  let seo = ROUTE_SEO[path] || ROUTE_SEO["/"] || {};

  if (path === "/" && search.includes("listing_mode=for_rent")) {
    seo = {
      title: "Homes for rent in Addis Ababa — Market Mizan (mmizan)",
      description:
        "Browse verified apartments and houses for rent in Addis Ababa on Market Mizan (mmizan.com)."
    };
  } else if (path === "/" && search.includes("listing_mode=for_sale")) {
    seo = {
      title: "Homes for sale in Addis Ababa — Market Mizan (mmizan)",
      description:
        "Browse verified apartments and houses for sale in Addis Ababa on Market Mizan (mmizan.com)."
    };
  }

  return (
    <SeoHead
      title={seo.title}
      description={seo.description}
      path={fullPath === "/" ? "/" : fullPath}
      noIndex={Boolean(seo.noIndex)}
    />
  );
}
