import assert from "node:assert/strict";
import { neighborhoodMapPoint } from "./mapLocation.js";

const ocean = neighborhoodMapPoint({ area: "Kirkos", lat: null, lng: null });
assert.ok(ocean.lat > 8.9 && ocean.lat < 9.1);
assert.ok(ocean.lng > 38.6 && ocean.lng < 38.9);
assert.equal(ocean.approximate, true);

const zero = neighborhoodMapPoint({ area: "Yeka", lat: 0, lng: 0 });
assert.notEqual(zero.lat, 0);
assert.equal(zero.approximate, true);

const bole = neighborhoodMapPoint({ area: "Bole", lat: 9.001774, lng: 38.788756 });
assert.equal(bole.lat, 9.001774);
assert.equal(bole.approximate, false);

console.log("neighborhoodMapPoint.test.js OK");
