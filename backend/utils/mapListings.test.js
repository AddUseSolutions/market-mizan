const assert = require("node:assert/strict");
const { shapeMapListing } = require("./mapListings");

const listing = shapeMapListing({
  property_id: "JP3174318",
  title: "House in Aware, Addis Ababa",
  price: 1603998.39,
  price_etb: 1603998.39,
  price_usd: 9947.81,
  property_status: "For Rent",
  bedrooms: 4,
  latitude: null,
  longitude: null,
  canonical_area: "Yeka",
  location_area: "Aware",
  images: ["https://cdn.example/aware.jpg", "https://cdn.example/aware-2.jpg"]
});

assert.equal(listing.property_id, "JP3174318");
assert.equal(listing.title, "House in Aware");
assert.equal(listing.listing_mode, "for_rent");
assert.equal(listing.latitude, null);
assert.equal(listing.longitude, null);
assert.deepEqual(listing.images, ["https://cdn.example/aware.jpg"]);
assert.equal(listing.area, "Yeka");

const exact = shapeMapListing({
  property_id: "MM1",
  title: "Apartment in Bole",
  property_status: "For Sale",
  latitude: 9.001,
  longitude: 38.789,
  price_usd: 120000,
  images: []
});
assert.equal(exact.latitude, 9.001);
assert.equal(exact.listing_mode, "for_sale");

assert.equal(shapeMapListing({ title: "Missing id" }), null);
assert.equal(
  shapeMapListing({ property_id: "MM0", latitude: 0, longitude: 0, property_status: "For Rent" }).latitude,
  null
);

console.log("mapListings.test.js OK");
