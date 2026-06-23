/**
 * Lightweight checks for compare helpers (run: node src/utils/compareProperty.test.js)
 */
import assert from "node:assert/strict";
import {
  buildCompareRows,
  listingModeKey,
  modesCompatible,
  pickBetterValue
} from "./compareProperty.js";

const t = (key) => key;

const rentalA = {
  property_id: "a",
  property_status: "For Rent",
  price_usd: 1000,
  price_etb: 130000,
  property_size_m2: 80,
  bedrooms: 2
};

const rentalB = {
  property_id: "b",
  property_status: "For Rent",
  price_usd: 1200,
  price_etb: 156000,
  property_size_m2: 100,
  bedrooms: 3
};

assert.equal(listingModeKey(rentalA), "for_rent");
assert.equal(modesCompatible(rentalA, rentalB), true);
assert.equal(modesCompatible(rentalA, { property_status: "For Sale" }), false);
assert.equal(pickBetterValue("price", rentalA, rentalB), "left");
assert.equal(pickBetterValue("livingArea", rentalA, rentalB), "right");

const rows = buildCompareRows(rentalA, t);
assert.ok(rows.find((r) => r.key === "price"));
assert.ok(rows.find((r) => r.key === "bedrooms"));

console.log("compareProperty.test.js OK");
