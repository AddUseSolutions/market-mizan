const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { extractExpatImagesFromHtml, hasJunkExpatGallery, listingNumericId } = require("./repairExpatImages");
const { isJunkImage, sanitizeListingImages } = require("./sanitizeListingImages");

const sampleHtml = `
<html><head>
<meta property="og:image" content="https://www.expat.com/upload/housing/755743/hero.jpeg"/>
<script type="application/ld+json">
{"@type":"RealEstateListing","image":[
  "https://www.expat.com/upload/housing/755743/a.jpeg",
  "https://www.expat.com/upload/housing/755743/b.jpeg",
  "https://www.expat.com/upload/housing/999999/other.jpeg"
]}
</script>
</head><body>
<img src="https://www.expat.com/images/guides/1-v8_guide_block.jpg"/>
<img src="https://www.expat.com/images/marketplace/services/banking.jpg"/>
<img src="https://www.expat.com/upload/housing/815592/wrong.jpg"/>
</body></html>`;

const url =
  "https://www.expat.com/en/housing/africa/ethiopia/addis-ababa/39-houses-for-rent/755743-unique-and-cozy-house-in-bole.html";

assert.strictEqual(listingNumericId(url, "EX755743"), "755743");

const images = extractExpatImagesFromHtml(sampleHtml, url, "EX755743");
assert.ok(images.length >= 2, `expected gallery, got ${JSON.stringify(images)}`);
assert.ok(images.every((u) => u.includes("/upload/housing/755743/")));
assert.ok(!images.some((u) => u.includes("815592") || u.includes("guides") || u.includes("marketplace")));

assert.ok(isJunkImage("https://www.expat.com/images/guides/1.jpg"));
assert.ok(isJunkImage("https://www.expat.com/images/marketplace/services/banking.jpg"));
assert.ok(isJunkImage("https://www.expat.com/images/housing/location-header.jpg"));
assert.ok(!isJunkImage("https://www.expat.com/upload/housing/755743/a.jpeg"));

const junkStored = [
  "https://www.expat.com/images/guides/1-v8_guide_block-t1524808170.jpg",
  "https://www.expat.com/images/marketplace/services/banking.jpg"
];
assert.ok(hasJunkExpatGallery(junkStored));
assert.strictEqual(sanitizeListingImages(junkStored).length, 0);

const fixture = "/tmp/expat755743.html";
if (fs.existsSync(fixture)) {
  const html = fs.readFileSync(fixture, "utf8");
  const live = extractExpatImagesFromHtml(html, url, "EX755743");
  assert.ok(live.length >= 4, `live extract expected >=4 got ${live.length}`);
  assert.ok(live[0].includes("/upload/housing/755743/"));
  console.log("live fixture OK", live.length, live[0]);
}

console.log("repairExpatImages.test.js OK");
