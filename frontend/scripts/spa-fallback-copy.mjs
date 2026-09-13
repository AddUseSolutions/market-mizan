/**
 * Render static hosting often returns HTTP 404 for client routes even when
 * rewrite → index.html is configured. Copying index.html into known route
 * folders makes soft navigations and hard refreshes return 200.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const indexFile = path.join(dist, "index.html");

const ROUTES = [
  "about",
  "contact",
  "compare",
  "login",
  "list-your-property",
  "privacy",
  "terms",
  "legal-notice",
  "sitemap",
  "neighborhoods",
  "dashboard",
  "admin",
  "set-password",
  "search"
];

if (!fs.existsSync(indexFile)) {
  console.error("[spa-fallback] missing dist/index.html — run vite build first");
  process.exit(1);
}

for (const route of ROUTES) {
  const dir = path.join(dist, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(indexFile, path.join(dir, "index.html"));
}

console.log(`[spa-fallback] copied index.html into ${ROUTES.length} route folders`);
