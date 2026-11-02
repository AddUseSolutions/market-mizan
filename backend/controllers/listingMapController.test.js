const assert = require("node:assert/strict");
const { foldDistrictRows } = require("./listingMapController");

const rows = foldDistrictRows([
  { area: "Bole", mode: "rent", n: 10, on_map: 4 },
  { area: "Bole", mode: "sale", n: 3, on_map: 1 },
  { area: "Kirkos", mode: null, n: 2, on_map: 0 },
  { area: "Somewhere else", mode: "rent", n: 1, on_map: 1 }
]);

const bole = rows.find((row) => row.area === "Bole");
assert.equal(bole.total, 13);
assert.equal(bole.rent, 10);
assert.equal(bole.sale, 3);
assert.equal(bole.onMap, 5);

const kirkos = rows.find((row) => row.area === "Kirkos");
assert.equal(kirkos.other, 2);
assert.equal(kirkos.onMap, 0);

assert.equal(rows[0].area, "Bole");
assert.equal(rows.at(-1).area, "Somewhere else");
assert.ok(rows.some((row) => row.area === "Lemi Kura" && row.total === 0));

console.log("listingMapController.test.js OK");
