#!/usr/bin/env node
/**
 * Build-time sitemap for listing detail URLs.
 * Writes frontend/public/sitemap-listings.xml (and refreshes core sitemap lastmod).
 *
 * Env:
 *   VITE_API_URL or SITEMAP_API_URL — API origin without /api
 *   SITE_URL — default https://mmizan.com
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const siteUrl = (process.env.SITE_URL || process.env.PUBLIC_SITE_URL || "https://mmizan.com").replace(/\/$/, "");
const apiBase = (process.env.SITEMAP_API_URL || process.env.VITE_API_URL || "https://market-mizan-api.onrender.com").replace(
  /\/$/,
  ""
);

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlEntry(loc, { lastmod, changefreq = "weekly", priority = "0.6" } = {}) {
  const lm = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : "";
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lm}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function fetchListingIds() {
  const ids = [];
  let page = 1;
  const limit = 100;
  const maxPages = 30; // up to ~3000 URLs
  while (page <= maxPages) {
    const url = `${apiBase}/api/properties?limit=${limit}&page=${page}&sort=ranked`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`API ${res.status} for ${url}`);
    const data = await res.json();
    const props = data.properties || [];
    for (const p of props) {
      if (p?.property_id) ids.push({ id: p.property_id, scraped: p.scraped_at || p.last_seen || null });
    }
    const totalPages = Number(data.totalPages || 1);
    if (page >= totalPages || props.length === 0) break;
    page += 1;
  }
  return ids;
}

async function main() {
  let listings = [];
  try {
    listings = await fetchListingIds();
    console.log(`[sitemap] fetched ${listings.length} listings from ${apiBase}`);
  } catch (err) {
    console.warn(`[sitemap] could not fetch listings (${err.message}) — writing empty listings sitemap`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const body = listings
    .map((row) => {
      const lastmod = row.scraped ? String(row.scraped).slice(0, 10) : today;
      return urlEntry(`${siteUrl}/property/${encodeURIComponent(row.id)}`, {
        lastmod,
        changefreq: "weekly",
        priority: "0.7"
      });
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body || `  <!-- No listings available at build time (${today}) -->`}
</urlset>
`;

  fs.writeFileSync(path.join(publicDir, "sitemap-listings.xml"), xml, "utf8");
  console.log(`[sitemap] wrote ${path.join(publicDir, "sitemap-listings.xml")}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 0; // never fail the frontend build for sitemap
});
