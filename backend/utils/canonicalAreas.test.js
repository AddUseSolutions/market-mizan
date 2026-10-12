const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveCanonicalArea, resolveCanonicalAreaOrDefault } = require("./canonicalAreas");
const { cleanTitle } = require("./cleanTitle");

test("neighborhood names map to their sub-city", () => {
  assert.equal(resolveCanonicalArea({ title: "G2 House For Sale In Figa" }), "Yeka");
  assert.equal(resolveCanonicalArea({ title: "House For Sale For Sale In Meskel Flower" }), "Kirkos");
  assert.equal(resolveCanonicalArea({ title: "Hayhulet Furnished 4 Bedrooms Apartment For Rent" }), "Bole");
  assert.equal(resolveCanonicalArea({ title: "Torhayloch G4 Building For Sale" }), "Kolfe Keranio");
  assert.equal(resolveCanonicalArea({ location_area: "Merkato" }), "Addis Ketema");
});

test("an explicitly named sub-city wins over a neighborhood alias", () => {
  assert.equal(resolveCanonicalArea({ title: "Apartment in Wollo Sefer, Kirkos" }), "Kirkos");
});

test("unknown or outside-Addis listings stay unassigned instead of defaulting to Addis Ketema", () => {
  assert.equal(resolveCanonicalArea({ title: "Luxury Villa House For Sale" }), null);
  assert.equal(resolveCanonicalAreaOrDefault({ title: "Luxury Villa House For Sale" }), null);
  assert.equal(
    resolveCanonicalArea({ title: "House For Sale Legetafo Oromia", description: "20 minutes from Bole airport" }),
    null
  );
});

test("aliases match whole words only", () => {
  assert.equal(resolveCanonicalArea({ title: "Building near the international school" }), null);
  assert.equal(resolveCanonicalArea({ title: "Villa", description: "Please be aware of the gate code" }), null);
  assert.equal(resolveCanonicalArea({ title: "Apartment for rent", description: "Bole Kifle Ketema, near Edna Mall" }), "Bole");
});

test("cleanTitle strips agent codes, glued city names and slug counters", () => {
  assert.equal(cleanTitle("Modern 4 Bedroom Apartment For Sale In Cmc Sunrise_Geo"), "Modern 4 Bedroom Apartment For Sale In Cmc Sunrise");
  assert.equal(cleanTitle("Spacious 94 Sqm Apartment For Sale In Summit _Geo 2"), "Spacious 94 Sqm Apartment For Sale In Summit");
  assert.equal(cleanTitle("2 Bedroom Condominium For Sale In Ayataddis Ababa Hbr"), "2 Bedroom Condominium For Sale In Ayat");
  assert.equal(cleanTitle("Bole Olympia Three Bedrooms Apartment For Rent 2"), "Bole Olympia Three Bedrooms Apartment For Rent");
  assert.equal(cleanTitle("Condominium 20 80"), "Condominium 20 80");
});
