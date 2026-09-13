const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  inferListingStatusFromText,
  priceCapClause,
  hasPublicPriceSql,
  rentalStatusSql,
  saleStatusSql
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
    assert.match(hasPublicPriceSql(), /verification_status/);
    assert.match(priceCapClause(), /8000/);
    assert.match(priceCapClause(), /500000/);
  });

  it("requires a price unless verified", () => {
    const sql = hasPublicPriceSql();
    assert.match(sql, /verified/);
    assert.match(sql, /price_etb/);
  });
});
