import { useEffect } from "react";

const SITE = "https://mmizan.com";
const DEFAULT_TITLE = "Market Mizan (mmizan) — Homes for rent & sale in Addis Ababa";
const DEFAULT_DESC =
  "Market Mizan (mmizan.com) — compare verified homes for rent and sale in Addis Ababa. Search apartments, houses and villas by neighborhood, price and size.";

function upsertMeta(attr, key, content) {
  if (content == null || content === "") return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Per-route SEO for the SPA. Keeps brand spelling "Market Mizan" / "mmizan".
 */
export default function SeoHead({
  title,
  description = DEFAULT_DESC,
  path = "/",
  image = `${SITE}/logo-market-mizan-header.png`,
  noIndex = false,
  jsonLd = null
}) {
  useEffect(() => {
    const fullTitle = title
      ? title.includes("Market Mizan")
        ? title
        : `${title} | Market Mizan`
      : DEFAULT_TITLE;
    document.title = fullTitle;

    const canonical = path.startsWith("http") ? path : `${SITE}${path.startsWith("/") ? path : `/${path}`}`;

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:site_name", "Market Mizan");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);
    upsertLink("canonical", canonical);

    const scriptId = "mmizan-jsonld-page";
    let script = document.getElementById(scriptId);
    if (jsonLd) {
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else if (script) {
      script.remove();
    }
  }, [title, description, path, image, noIndex, jsonLd]);

  return null;
}

export { DEFAULT_TITLE, DEFAULT_DESC, SITE as SITE_URL };
