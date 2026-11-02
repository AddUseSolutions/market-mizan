import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const file = join(dirname(fileURLToPath(import.meta.url)), "addisSubcities.json");
const data = JSON.parse(readFileSync(file, "utf8"));
const names = data.districts.map((district) => district.name);

assert.deepEqual(names, [
  "Addis Ketema",
  "Akaki Kaliti",
  "Arada",
  "Bole",
  "Gullele",
  "Kirkos",
  "Kolfe Keranio",
  "Lideta",
  "Nifas Silk-Lafto",
  "Yeka"
]);

for (const district of data.districts) {
  assert.ok(district.path.length >= 8, district.name);
  for (const [lat, lng] of district.path) {
    assert.ok(lat >= 8.8 && lat <= 9.12, `${district.name} lat ${lat}`);
    assert.ok(lng >= 38.6 && lng <= 38.95, `${district.name} lng ${lng}`);
  }
}

console.log("addisSubcities.test.js OK");
