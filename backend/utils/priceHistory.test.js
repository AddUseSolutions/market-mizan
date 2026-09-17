const test = require("node:test");
const assert = require("node:assert/strict");
const { pricesDiffer, toNum } = require("./priceHistory");

test("toNum parses finite numbers", () => {
  assert.equal(toNum("1200.5"), 1200.5);
  assert.equal(toNum(null), null);
  assert.equal(toNum(""), null);
  assert.equal(toNum("x"), null);
});

test("pricesDiffer treats tiny float noise as equal", () => {
  assert.equal(pricesDiffer(100, 100.005), false);
  assert.equal(pricesDiffer(100, 101), true);
  assert.equal(pricesDiffer(null, 50), true);
  assert.equal(pricesDiffer(null, null), false);
});
