const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const sharp = require("sharp");

const stored = [];
const connectionPath = path.join(__dirname, "..", "db", "connection.js");
require.cache[connectionPath] = {
  id: connectionPath,
  filename: connectionPath,
  loaded: true,
  exports: {
    dialect: "postgres",
    query: async (sql, params = []) => {
      if (/INSERT INTO media_files/.test(sql)) {
        const [media_key, variant, mime, width, height, byte_size, data] = params;
        stored.push({ media_key, variant, mime, width, height, byte_size, data });
        return [[]];
      }
      if (/SELECT mime, data FROM media_files/.test(sql)) {
        const [key, variant] = params;
        const row = stored.find((r) => r.media_key === key && r.variant === variant);
        return [row ? [row] : []];
      }
      return [[]];
    }
  }
};

process.env.PUBLIC_API_URL = "https://api.example.test/";
const { storeImage, persistInlineImages, getMediaVariant, isMediaKey } = require("./mediaStore");

async function photo(width, height, orientation) {
  return sharp({ create: { width, height, channels: 3, background: { r: 40, g: 120, b: 200 } } })
    .jpeg({ quality: 95 })
    .withMetadata(orientation ? { orientation } : {})
    .toBuffer();
}

test("storeImage keeps the original and renders lg/sm variants", async () => {
  stored.length = 0;
  const original = await photo(6000, 4000);
  const url = await storeImage(original, "image/jpeg");

  const match = url.match(/^https:\/\/api\.example\.test\/api\/media\/([a-f0-9]{32})$/);
  assert.ok(match, url);
  const key = match[1];
  assert.ok(isMediaKey(key));

  const byVariant = Object.fromEntries(stored.map((r) => [r.variant, r]));
  assert.deepEqual(Object.keys(byVariant).sort(), ["lg", "orig", "sm"]);
  assert.equal(byVariant.orig.data, original, "original bytes untouched");
  assert.equal(byVariant.lg.width, 3200);
  assert.equal(byVariant.lg.height, 2133);
  assert.equal(byVariant.sm.width, 960);
  assert.equal(byVariant.lg.mime, "image/jpeg");

  const served = await getMediaVariant(key, "lg");
  assert.equal(served.data, byVariant.lg.data);
});

test("small photos are not upscaled and EXIF rotation is applied", async () => {
  stored.length = 0;
  await storeImage(await photo(800, 600, 6), "image/jpeg");
  const lg = stored.find((r) => r.variant === "lg");
  assert.equal(lg.width, 600);
  assert.equal(lg.height, 800);
});

test("persistInlineImages converts data URLs and keeps remote URLs", async () => {
  stored.length = 0;
  const b64 = (await photo(1200, 900)).toString("base64");
  const out = await persistInlineImages([
    "https://cdn.example.com/a.jpg",
    `data:image/jpeg;base64,${b64}`,
    "data:image/png;base64,bm90LWFuLWltYWdl"
  ]);
  assert.equal(out.length, 2, "undecodable inline image dropped");
  assert.equal(out[0], "https://cdn.example.com/a.jpg");
  assert.match(out[1], /\/api\/media\/[a-f0-9]{32}$/);
});
