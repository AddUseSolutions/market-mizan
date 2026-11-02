const assert = require("node:assert/strict");
const { selectPublicGallery, PUBLIC_GALLERY_MAX } = require("./publicGallery");

const photos = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

const picked = selectPublicGallery(photos, [3, 0, 3, 9, 99]);
assert.equal(picked.ok, true);
assert.deepEqual(picked.images, ["d", "a", "j"]);

const capped = selectPublicGallery(photos, [0, 1, 2, 3, 4, 5, 6, 7]);
assert.equal(capped.images.length, PUBLIC_GALLERY_MAX);
assert.deepEqual(capped.images, ["a", "b", "c", "d", "e", "f"]);

const firstSix = selectPublicGallery(photos);
assert.deepEqual(firstSix.images, ["a", "b", "c", "d", "e", "f"]);

const none = selectPublicGallery(photos, []);
assert.equal(none.ok, false);

const empty = selectPublicGallery([]);
assert.deepEqual(empty.images, []);

console.log("publicGallery.test.js OK");
