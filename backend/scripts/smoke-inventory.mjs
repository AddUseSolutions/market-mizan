#!/usr/bin/env node
/**
 * Live API regression smoke for the "missing listings" class of bugs.
 * Run: node scripts/smoke-inventory.mjs [baseUrl]
 *
 * Asserts:
 * - health OK
 * - rent + sale ≈ all (mode gap)
 * - no zero prices on first deep pages
 * - core filters return results
 */
const base = (process.argv[2] || process.env.API_BASE || "https://market-mizan-api.onrender.com").replace(/\/$/, "");

async function get(path, params = {}) {
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, json, text: text.slice(0, 200) };
}

function fail(msg) {
  console.error("FAIL:", msg);
  process.exitCode = 1;
}

async function main() {
  const health = await get("/health");
  if (!health.ok || health.json?.status !== "ok") fail(`health ${health.status} ${health.text}`);
  else console.log("OK health");

  const all = await get("/api/properties", { limit: 1 });
  const rent = await get("/api/properties", { limit: 1, listing_mode: "for_rent" });
  const sale = await get("/api/properties", { limit: 1, listing_mode: "for_sale" });
  if (!all.ok || !rent.ok || !sale.ok) fail("properties endpoints not OK");

  const a = Number(all.json?.total || 0);
  const r = Number(rent.json?.total || 0);
  const s = Number(sale.json?.total || 0);
  const gap = a - r - s;
  console.log(`inventory all=${a} rent=${r} sale=${s} gap=${gap}`);
  if (a < 50) fail(`public inventory too small: ${a}`);
  if (r < 20 || s < 10) fail(`rent/sale too small: rent=${r} sale=${s}`);
  if (Math.abs(gap) > 5) fail(`mode gap too large (${gap}) — likely missing listing_mode / status filter bug`);

  for (const [mode, page] of [
    ["for_rent", 5],
    ["for_sale", 3]
  ]) {
    const deep = await get("/api/properties", { limit: 12, page, listing_mode: mode, sort: "ranked" });
    const props = deep.json?.properties || [];
    const zeros = props.filter(
      (p) => !(Number(p.price_etb) > 0 || Number(p.price_usd) > 0)
    ).length;
    console.log(`${mode} page ${page}: zeros=${zeros}/${props.length}`);
    if (zeros > 0) fail(`${mode} page ${page} still has zero-price cards`);
  }

  const bole = await get("/api/properties", {
    limit: 3,
    area: "Bole",
    property_type_group: "residential_apartment"
  });
  if (!bole.ok || Number(bole.json?.total || 0) < 1) fail("Bole apartments filter empty");
  else console.log(`OK bole apartments total=${bole.json.total}`);

  if (process.exitCode) {
    console.error("\nSmoke FAILED");
    process.exit(1);
  }
  console.log("\nSmoke PASSED — inventory regressions not present");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
