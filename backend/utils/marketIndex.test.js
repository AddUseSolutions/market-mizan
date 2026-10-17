const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyPropertyJs, pctChange, tickerFromReport, PRIMARY_CLASSES } = require("./marketIndex");

test("classifyPropertyJs maps messy provider labels into analysis classes", () => {
  assert.equal(classifyPropertyJs({ property_type: "Apartment For Rent", title: "" }), "apartment");
  assert.equal(classifyPropertyJs({ property_type: "Condo", title: "Bole" }), "apartment");
  assert.equal(classifyPropertyJs({ property_type: "G+2 House", title: "Villa" }), "house");
  assert.equal(classifyPropertyJs({ property_type: "Residential Land", title: "Plot" }), "land");
  assert.equal(classifyPropertyJs({ property_type: "Office space", title: "" }), "office");
  assert.equal(classifyPropertyJs({ property_type: "Shop / Retail", title: "" }), "shop");
  assert.equal(classifyPropertyJs({ property_type: "Warehouse", title: "" }), "other");
});

test("pctChange returns relative change or null when previous is missing", () => {
  assert.equal(pctChange(110, 100), 0.1);
  assert.equal(pctChange(90, 100), -0.1);
  assert.equal(pctChange(100, 0), null);
  assert.equal(pctChange(100, null), null);
});

test("tickerFromReport filters to one class/mode and sorts by USD/m²", () => {
  const report = {
    generatedAt: "2026-10-17T00:00:00.000Z",
    compareDate: "2026-09-17",
    indexes: [
      { district: "Lideta", property_class: "apartment", listing_mode: "rent", listing_count: 10, avg_pps_usd: 8, mom_pps_pct: 0.02, mom_count_pct: 0.1 },
      { district: "Bole", property_class: "apartment", listing_mode: "rent", listing_count: 40, avg_pps_usd: 14, mom_pps_pct: -0.03, mom_count_pct: 0.05 },
      { district: "Bole", property_class: "house", listing_mode: "rent", listing_count: 12, avg_pps_usd: 20, mom_pps_pct: 0, mom_count_pct: 0 },
      { district: "Yeka", property_class: "apartment", listing_mode: "sale", listing_count: 5, avg_pps_usd: 900, mom_pps_pct: null, mom_count_pct: null }
    ]
  };
  const ticker = tickerFromReport(report, { propertyClass: "apartment", listingMode: "rent" });
  assert.equal(ticker.propertyClass, "apartment");
  assert.equal(ticker.listingMode, "rent");
  assert.equal(ticker.items.length, 2);
  assert.equal(ticker.items[0].district, "Bole");
  assert.equal(ticker.items[0].avgPpsUsd, 14);
  assert.equal(ticker.datasets.length, PRIMARY_CLASSES.length * 2);
});
