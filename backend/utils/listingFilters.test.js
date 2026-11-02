const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  inferListingStatusFromText,
  priceCapClause,
  hasPublicPriceSql,
  rentalStatusSql,
  saleStatusSql,
  usdEstimateSql
} = require("./listingFilters");

describe("inferListingStatusFromText", () => {
  it("detects rent from title", () => {
    assert.equal(inferListingStatusFromText("3BR Apartment For Rent in Bole"), "For Rent");
  });

  it("detects sale from title", () => {
    assert.equal(inferListingStatusFromText("Villa For Sale in Yeka"), "For Sale");
  });

  it("defaults EthiopiaRealty without mode word to sale", () => {
    assert.equal(
      inferListingStatusFromText("Urgent opportunity Lideta", { sourceWebsite: "ethiopiarealty.com" }),
      "For Sale"
    );
  });

  it("returns null when ambiguous and no ER default", () => {
    assert.equal(inferListingStatusFromText("Nice home in Bole"), null);
  });
});

describe("public price SQL helpers", () => {
  it("exports non-empty SQL fragments", () => {
    assert.match(rentalStatusSql(), /for rent/i);
    assert.match(saleStatusSql(), /for sale/i);
    assert.match(hasPublicPriceSql(), /price_etb/);
    assert.match(priceCapClause(), /8000/);
    assert.match(priceCapClause(), /500000/);
  });

  it("never reads the birr column as dollars", () => {
    const sql = usdEstimateSql(130);
    assert.match(sql, /NULLIF\(price_usd, 0\)/);
    assert.match(sql, /\/ 130/);
    assert.doesNotMatch(sql, /COALESCE\(price_usd, price\)/);
  });

  it("dedupes source URLs in one pass", () => {
    const { canonicalDetailUrlSql } = require("./listingFilters");
    const sql = canonicalDetailUrlSql();
    assert.match(sql, /ROW_NUMBER\(\)/);
    assert.doesNotMatch(sql, /p_keep\.detail_url = properties\.detail_url/);
  });

  it("keeps one row per source URL and prefers the priced copy", () => {
    const { chooseCanonicalListings } = require("./listingFilters");
    const url = "https://realethio.com/property/house-for-sale-imperial/";
    const kept = chooseCanonicalListings([
      { listing_ref: "MM3403", detail_url: url, price_usd: null, price_etb: null, price: null },
      { listing_ref: "MM1067", detail_url: url, price_usd: 1000, price_etb: 130000 }
    ]);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].listing_ref, "MM1067");
  });

  it("uses land area for a house sale and drops rent above 50 USD per m²", () => {
    const { ppsUsdOfListing } = require("./listingFilters");
    assert.equal(
      ppsUsdOfListing({
        property_type: "House for sale",
        title: "House for sale",
        property_status: "For Sale",
        price_usd: 200000,
        property_size_m2: 200,
        land_area_m2: 500
      }),
      400
    );
    assert.equal(
      ppsUsdOfListing({
        property_type: "Building for rent",
        title: "Building for rent",
        property_status: "For Rent",
        price_usd: 36923,
        property_size_m2: 450
      }),
      null
    );
  });
});
