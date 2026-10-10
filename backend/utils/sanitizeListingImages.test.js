const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  sanitizeListingImages,
  dropTitleMismatchedImages,
  isJunkImage
} = require("./sanitizeListingImages");

describe("isJunkImage", () => {
  it("drops logos and agent chrome", () => {
    assert.equal(isJunkImage("https://x.com/logo.png"), true);
    assert.equal(isJunkImage("https://x.com/wp-content/uploads/masre-portfolio.jpg"), true);
  });

  it("keeps normal gallery photos", () => {
    assert.equal(
      isJunkImage("https://ethiopiarealty.com/wp-content/uploads/2026/06/540-Sqm-Building-for-Sale-in-Lideta.jpg"),
      false
    );
  });
});

describe("dropTitleMismatchedImages", () => {
  const title = "540 Sqm Building For Sale In Lideta";
  const wrong = [
    "https://ethiopiarealty.com/wp-content/uploads/2026/06/175sqm-Building-for-Sale-in-Lafto-Addis-Ababa-1.jpg",
    "https://ethiopiarealty.com/wp-content/uploads/2026/06/22-BD-G4-Commercial-Building-426-sqm-Bole.jpg"
  ];
  const right =
    "https://ethiopiarealty.com/wp-content/uploads/2026/06/540-Sqm-Building-for-Sale-in-Lideta-Addis-Ababa-1.jpg";

  it("keeps title-matching photos when present", () => {
    const kept = dropTitleMismatchedImages([...wrong, right], title);
    assert.deepEqual(
      kept.map((u) => u.split("/").pop()),
      ["540-Sqm-Building-for-Sale-in-Lideta-Addis-Ababa-1.jpg"]
    );
  });

  it("returns empty when every filename conflicts (prefer no photo over wrong photo)", () => {
    const kept = dropTitleMismatchedImages(wrong, title);
    assert.deepEqual(kept, []);
  });
});

describe("sanitizeListingImages", () => {
  it("applies title mismatch filtering end-to-end", () => {
    const title = "540 Sqm Building For Sale In Lideta";
    const out = sanitizeListingImages(
      [
        "https://ethiopiarealty.com/wp-content/uploads/2026/06/175sqm-Building-for-Sale-in-Lafto-Addis-Ababa-1-584x438.jpg",
        "https://ethiopiarealty.com/wp-content/uploads/2026/06/540-Sqm-Building-for-Sale-in-Lideta-Addis-Ababa-1.jpg"
      ],
      { title }
    );
    assert.equal(out.length, 1);
    assert.match(out[0], /Lideta/i);
  });

  it("blanks a gallery when every filename conflicts with the title", () => {
    const title = "540 Sqm Building For Sale In Lideta";
    const out = sanitizeListingImages(
      [
        "https://ethiopiarealty.com/wp-content/uploads/2026/06/175sqm-Building-for-Sale-in-Lafto-Addis-Ababa-1.jpg",
        "https://ethiopiarealty.com/wp-content/uploads/2026/06/22-BD-G4-Commercial-Building-426-sqm-Bole.jpg"
      ],
      { title }
    );
    assert.equal(out.length, 0);
  });

  it("keeps Market Mizan media uploads untouched", () => {
    const urls = [
      "https://market-mizan-api.onrender.com/api/media/0f3a9c2b7d6e4f1a8b5c9d0e1f2a3b4c",
      "https://market-mizan-api.onrender.com/api/media/a1b2c3d4e5f60718293a4b5c6d7e8f90"
    ];
    const out = sanitizeListingImages(urls, { title: "3 Bedroom Apartment in Bole", area: "Bole" });
    assert.deepEqual(out.sort(), [...urls].sort());
  });
});
