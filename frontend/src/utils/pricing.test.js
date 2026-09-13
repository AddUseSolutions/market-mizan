/**
 * Pricing trust helpers — run: npm test
 */
import assert from "node:assert/strict";
import { hasPlausiblePrice, getPriceLines, isRentalListing } from "./pricing.js";

assert.equal(isRentalListing({ property_status: "For Rent" }), true);
assert.equal(isRentalListing({ listing_mode: "for_rent" }), true);
assert.equal(isRentalListing({ property_status: "For Sale" }), false);

assert.equal(hasPlausiblePrice({ property_status: "For Rent", price_etb: 2500 }), false);
assert.equal(hasPlausiblePrice({ property_status: "For Rent", price_etb: 25000 }), true);
assert.equal(hasPlausiblePrice({ property_status: "For Sale", price_etb: 100000 }), false);
assert.equal(hasPlausiblePrice({ property_status: "For Sale", price_etb: 5_000_000 }), true);
assert.equal(hasPlausiblePrice({ property_status: "For Sale", price_etb: 0 }), false);

const onRequest = getPriceLines({ property_status: "For Sale", price_etb: 0 });
assert.equal(onRequest.onRequest, true);

const ok = getPriceLines({ property_status: "For Sale", price_etb: 10_000_000, price_usd: 76923 });
assert.equal(ok.onRequest, false);
assert.match(ok.etb, /ETB/);

console.log("pricing.test.js ok");
