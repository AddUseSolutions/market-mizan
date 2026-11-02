import assert from "node:assert/strict";
import { cleanTitle } from "./cleanTitle.js";

assert.equal(cleanTitle("For rent – Bole, 9322858 bedrooms, 225588 baths"), "For rent – Bole");
assert.equal(cleanTitle("3 bedroom apartment in Bole, Addis Ababa"), "3 bedroom apartment in Bole");

console.log("cleanTitle.test.js OK");
