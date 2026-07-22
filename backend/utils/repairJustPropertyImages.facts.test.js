const assert = require("assert");
const { extractFactsFromHtml } = require("./repairJustPropertyImages");

/** Minimal JP-like strip that previously made beds=3 baths=2. */
const SAMPLE = `
<html><head>
<meta property="og:title" content="4 Bedroom House To Let in Besrat Gebriel | Just Property" />
<meta property="og:description" content="Spacious villa | 4BR with Lush Garden" />
</head><body>
R132,871.20 pm
4 Bedroom House To Let in Besrat Gebriel
4 Bedrooms 3 Bathrooms
Private Sale
Features Interior 4 Bedrooms 3 Bathrooms 2 Kitchens 1 Dining Room 1 Study
</body></html>
`;

const facts = extractFactsFromHtml(
  SAMPLE,
  "https://www.just.property/results/residential/to-let/nefas-silk-lafto/besrat-gebriel/house/3174290/"
);

assert.strictEqual(facts.bedrooms, 4, `bedrooms=${facts.bedrooms}`);
assert.strictEqual(facts.bathrooms, 3, `bathrooms=${facts.bathrooms}`);
assert.strictEqual(facts.property_type, "House");
console.log("repairJustPropertyImages.facts.test.js OK");
