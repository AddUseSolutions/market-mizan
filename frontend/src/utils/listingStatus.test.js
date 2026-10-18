import assert from "node:assert/strict";
import { getAvailabilityKey, getListingModeLabel } from "./listingStatus.js";

const t = (k) => k;

assert.equal(getListingModeLabel({ property_status: "For Rent" }, t), "forRent");
assert.equal(getListingModeLabel({ property_status: "For Sale" }, t), "forSale");

assert.equal(getAvailabilityKey({ property_status: "For Rent" }), "statusAvailable");
assert.equal(getAvailabilityKey({ property_status: "Sold" }), "statusSold");
assert.equal(getAvailabilityKey({ property_status: "Already rented" }), "statusRented");
assert.equal(getAvailabilityKey({ property_status: "Vacant" }), "statusVacant");
assert.equal(getAvailabilityKey({ property_status: "For Rent", is_active: false }), "statusSold");

console.log("listingStatus.test.js OK");
