/**
 * Checks for the EXIF GPS reader (run: node src/utils/exifGps.test.js)
 */
import assert from "node:assert/strict";
import { readExifGps } from "./exifGps.js";

function buildJpegWithGps({ lat, lng, little = true }) {
  const tiff = new ArrayBuffer(200);
  const v = new DataView(tiff);
  v.setUint16(0, little ? 0x4949 : 0x4d4d);
  v.setUint16(2, 42, little);
  v.setUint32(4, 8, little);

  // IFD0 at 8: one entry -> GPS IFD pointer
  v.setUint16(8, 1, little);
  v.setUint16(10, 0x8825, little);
  v.setUint16(12, 4, little);
  v.setUint32(14, 1, little);
  v.setUint32(18, 26, little);
  v.setUint32(22, 0, little);

  // GPS IFD at 26: four entries
  const entries = [
    [0x0001, 2, 2, (lat < 0 ? "S" : "N").charCodeAt(0)],
    [0x0002, 5, 3, 100],
    [0x0003, 2, 2, (lng < 0 ? "W" : "E").charCodeAt(0)],
    [0x0004, 5, 3, 124]
  ];
  v.setUint16(26, entries.length, little);
  entries.forEach(([tag, type, count, value], i) => {
    const e = 28 + i * 12;
    v.setUint16(e, tag, little);
    v.setUint16(e + 2, type, little);
    v.setUint32(e + 4, count, little);
    if (type === 2) v.setUint8(e + 8, value);
    else v.setUint32(e + 8, value, little);
  });

  const writeDms = (offset, decimal) => {
    const abs = Math.abs(decimal);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = Math.round(((abs - d) * 60 - m) * 60 * 1000);
    [[d, 1], [m, 1], [s, 1000]].forEach(([num, den], i) => {
      v.setUint32(offset + i * 8, num, little);
      v.setUint32(offset + i * 8 + 4, den, little);
    });
  };
  writeDms(100, lat);
  writeDms(124, lng);

  const exifHeader = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
  const app1Len = 2 + exifHeader.length + tiff.byteLength;
  const out = new Uint8Array(2 + 2 + app1Len + 2);
  let p = 0;
  out[p++] = 0xff; out[p++] = 0xd8;
  out[p++] = 0xff; out[p++] = 0xe1;
  out[p++] = (app1Len >> 8) & 0xff; out[p++] = app1Len & 0xff;
  exifHeader.forEach((b) => { out[p++] = b; });
  out.set(new Uint8Array(tiff), p);
  p += tiff.byteLength;
  out[p++] = 0xff; out[p++] = 0xd9;
  return new Blob([out], { type: "image/jpeg" });
}

const bole = { lat: 8.995, lng: 38.789 };

for (const little of [true, false]) {
  const gps = await readExifGps(buildJpegWithGps({ ...bole, little }));
  assert.ok(gps, `gps parsed (little=${little})`);
  assert.ok(Math.abs(gps.lat - bole.lat) < 0.0005, `lat ${gps.lat}`);
  assert.ok(Math.abs(gps.lng - bole.lng) < 0.0005, `lng ${gps.lng}`);
}

const south = await readExifGps(buildJpegWithGps({ lat: -8.5, lng: -38.5 }));
assert.ok(south.lat < 0 && south.lng < 0, "S/W refs flip sign");

assert.equal(await readExifGps(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" })), null);
assert.equal(await readExifGps(new Blob(["png"], { type: "image/png" })), null);
assert.equal(await readExifGps(null), null);

console.log("exifGps tests passed");
