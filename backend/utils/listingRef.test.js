const test = require("node:test");
const assert = require("node:assert/strict");
const { formatListingRef, parseListingRef } = require("./listingRef");

test("formatListingRef builds MM + id", () => {
  assert.equal(formatListingRef(42), "MM42");
  assert.equal(formatListingRef("7"), "MM7");
  assert.equal(formatListingRef(0), null);
  assert.equal(formatListingRef(null), null);
  assert.equal(formatListingRef("abc"), null);
});

test("parseListingRef accepts common spellings", () => {
  assert.equal(parseListingRef("MM42"), 42);
  assert.equal(parseListingRef("mm42"), 42);
  assert.equal(parseListingRef(" MM 42 "), 42);
  assert.equal(parseListingRef("MM-42"), 42);
  assert.equal(parseListingRef("#MM42"), 42);
});

test("parseListingRef rejects source ids and free text", () => {
  assert.equal(parseListingRef("JP3344056"), null);
  assert.equal(parseListingRef("MM"), null);
  assert.equal(parseListingRef("MM0"), null);
  assert.equal(parseListingRef("bole mm42"), null);
  assert.equal(parseListingRef(""), null);
});
