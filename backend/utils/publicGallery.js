const PUBLIC_GALLERY_MAX = 6;

function parseImageList(raw) {
  let images = raw;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [];
    }
  }
  return Array.isArray(images) ? images.filter(Boolean) : [];
}

/**
 * Public listing gallery. Indexes are the admin's order.
 * Missing indexes keep the first photos, never more than 6.
 */
function selectPublicGallery(rawImages, indexes) {
  const all = parseImageList(rawImages);
  if (!all.length) return { ok: true, images: [] };

  const source = Array.isArray(indexes) ? indexes : all.map((_, index) => index);
  const chosen = [];
  const seen = new Set();
  for (const raw of source) {
    const index = Number(raw);
    if (!Number.isInteger(index) || index < 0 || index >= all.length || seen.has(index)) continue;
    seen.add(index);
    chosen.push(all[index]);
    if (chosen.length === PUBLIC_GALLERY_MAX) break;
  }
  if (!chosen.length) {
    return { ok: false, message: "Choose at least one photo to show. Up to 6 can be visible." };
  }
  return { ok: true, images: chosen };
}

module.exports = { PUBLIC_GALLERY_MAX, parseImageList, selectPublicGallery };
