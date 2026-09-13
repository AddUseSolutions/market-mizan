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

  it("keeps only title-matching photos", () => {
    const kept = dropTitleMismatchedImages([...wrong, right], title);
    assert.deepEqual(
      kept.map((u) => u.split("/").pop()),
      ["540-Sqm-Building-for-Sale-in-Lideta-Addis-Ababa-1.jpg"]
    );
  });

  it("returns empty when every photo conflicts", () => {
    assert.deepEqual(dropTitleMismatchedImages(wrong, title), []);
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
});
