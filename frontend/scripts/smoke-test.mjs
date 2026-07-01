import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE_URL || "https://market-mizan-web.onrender.com";
const API = process.env.SMOKE_API_URL || "https://market-mizan-api.onrender.com";

const errors = [];

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    errors.push(`${name}: ${e.message}`);
    console.error(`✗ ${name}: ${e.message}`);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});

await check("Homepage loads listings", async () => {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("article", { timeout: 30000 });
  const text = await page.textContent("body");
  if (!text || /white screen|Cannot GET/i.test(text)) throw new Error("broken page body");
});

await check("Listing count formatted", async () => {
  const listingsHeading = page.locator("h2", { hasText: /listings|ማስታወቂያ|إعلان|tarreeffama/i });
  const t = await listingsHeading.first().textContent();
  if (!t || !/\d/.test(t)) throw new Error(`no listings heading: ${t}`);
});

await check("Language switcher", async () => {
  await page.getByRole("group", { name: /language|ቋንቋ|اللغة|Afaan/i }).getByRole("button", { name: "عربي" }).click();
  await page.getByRole("group", { name: /language|ቋንቋ|اللغة|Afaan/i }).getByRole("button", { name: "EN", exact: true }).click();
});

await check("Map teaser link works", async () => {
  const link = page.getByRole("link", { name: /map|kaartaa|ካርታ|الخريطة/i }).first();
  if (!(await link.count())) throw new Error("map link missing");
});

await check("Property detail opens", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.locator("article").first().click();
  await page.waitForURL(/\/property\//, { timeout: 15000 });
  await page.waitForSelector("h1", { timeout: 15000 });
});

await check("Neighborhoods map page", async () => {
  await page.goto(`${BASE}/neighborhoods`, { waitUntil: "networkidle", timeout: 60000 });
  const body = await page.textContent("body");
  if (/404|not found/i.test(body || "") && !body?.includes("leaflet")) {
    throw new Error("neighborhoods page not loading");
  }
});

await check("Footer has no duplicate WhatsApp CTA", async () => {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const footerWa = page.locator("footer a").filter({ hasText: /WhatsApp/i });
  const count = await footerWa.count();
  if (count > 0) throw new Error(`footer still has ${count} WhatsApp link(s)`);
});

await check("Floating WhatsApp FAB exists", async () => {
  const fab = page.locator("a.btn-whatsapp, a[aria-label*='WhatsApp']");
  if (!(await fab.count())) throw new Error("floating WhatsApp missing");
});

await browser.close();

if (errors.length) {
  console.error("\nFailed checks:", errors.length);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
