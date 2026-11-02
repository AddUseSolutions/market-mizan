import assert from "node:assert/strict";
import { clusterPins, formatPinPrice, placeListingPins } from "./listingMapPins.js";

const pins = placeListingPins([
  { property_id: "a", area: "Yeka", latitude: null, longitude: null },
  { property_id: "b", area: "Yeka", latitude: null, longitude: null },
  { property_id: "c", area: "Bole", latitude: 9.001, longitude: 38.789 }
]);

const bole = pins.find((pin) => pin.property_id === "c");
assert.equal(bole.approximate, false);
assert.equal(bole.lat, 9.001);

const yeka = pins.filter((pin) => pin.property_id === "a" || pin.property_id === "b");
assert.equal(yeka.length, 2);
assert.ok(yeka.every((pin) => pin.approximate));
assert.notEqual(yeka[0].lat, yeka[1].lat);
assert.ok(yeka.every((pin) => pin.lat > 8.76 && pin.lat < 9.14));

const clustered = clusterPins(
  [
    { property_id: "1", lat: 9.01, lng: 38.76 },
    { property_id: "2", lat: 9.012, lng: 38.762 },
    { property_id: "3", lat: 9.011, lng: 38.761 }
  ],
  { zoom: 11 }
);
assert.equal(clustered.length, 1);
assert.equal(clustered[0].type, "cluster");
assert.equal(clustered[0].count, 3);

const opened = clusterPins(
  [
    { property_id: "1", lat: 9.01, lng: 38.76 },
    { property_id: "2", lat: 9.012, lng: 38.762 },
    { property_id: "3", lat: 9.011, lng: 38.761 }
  ],
  { zoom: 11, selectedId: "2" }
);
assert.equal(opened.filter((item) => item.type === "pin").length, 1);
assert.equal(opened.find((item) => item.type === "pin").pin.property_id, "2");
assert.equal(opened.find((item) => item.type === "cluster").count, 2);

assert.equal(formatPinPrice({ price_usd: 9947 }), "$10K");
assert.equal(formatPinPrice({ price_etb: 1603998 }), "ETB 1.6M");

console.log("listingMapPins.test.js OK");
