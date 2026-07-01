import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE_URL || "https://market-mizan-web.onrender.com";
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

await check("Compare page loads", async () => {
  await page.goto(`${BASE}/compare`, { waitUntil: "networkidle", timeout: 60000 });
  const body = await page.textContent("body");
  if (/404|not found/i.test(body || "")) throw new Error("compare 404");
});

await check("List your property form", async () => {
  await page.goto(`${BASE}/list-your-property`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("form, select, input", { timeout: 15000 });
});

await check("Contact page", async () => {
  await page.goto(`${BASE}/contact`, { waitUntil: "networkidle", timeout: 60000 });
  const body = await page.textContent("body");
  if (!body || body.length < 100) throw new Error("contact page empty");
});

await check("About page", async () => {
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle", timeout: 60000 });
  const h1 = await page.locator("h1").first().textContent();
  if (!h1) throw new Error("about missing h1");
});

await check("Sitemap page", async () => {
  await page.goto(`${BASE}/sitemap`, { waitUntil: "networkidle", timeout: 60000 });
  const links = await page.locator("a[href]").count();
  if (links < 3) throw new Error("sitemap too few links");
});

await check("Home multi-area filter in URL", async () => {
  await page.goto(`${BASE}/?area=Bole,Kirkos`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("article", { timeout: 30000 });
  const url = page.url();
  if (!url.includes("area=")) throw new Error("area param lost");
});

await check("Property detail contact form", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.locator("article").first().click();
  await page.waitForURL(/\/property\//, { timeout: 15000 });
  const form = page.locator("form").first();
  if (!(await form.count())) throw new Error("no contact form on detail");
});

await browser.close();

if (errors.length) {
  console.error("\nFailed:", errors.length);
  process.exit(1);
}
console.log("\nAll journey checks passed.");
