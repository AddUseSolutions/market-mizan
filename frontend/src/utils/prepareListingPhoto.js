const ACCEPTED_TYPE = /^image\/(jpeg|png|webp)$/i;
const MAX_CANVAS_PIXELS = 16_000_000;

async function decode(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall through to <img> decoding (e.g. HEIC on Safari) */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Returns a File the API accepts (JPEG/PNG/WebP, <= maxBytes).
 * Accepted files are uploaded untouched (full quality); only HEIC or files above
 * maxBytes are re-encoded as high-quality JPEG at full resolution (capped at maxDim).
 * Returns null when the image cannot be decoded or shrunk below maxBytes.
 */
export async function prepareListingPhoto(file, { maxBytes, maxDim = 6000 } = {}) {
  if (!file) return null;
  if (ACCEPTED_TYPE.test(file.type) && file.size <= maxBytes) return file;

  try {
    const source = await decode(file);
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    if (!width || !height) return null;

    // iOS Safari silently renders blank canvases above ~16.7 MP.
    const scale = Math.min(1, maxDim / Math.max(width, height), Math.sqrt(MAX_CANVAS_PIXELS / (width * height)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
    source.close?.();

    for (const quality of [0.95, 0.9, 0.85]) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= maxBytes) {
        const name = (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg";
        return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
      }
    }
    return null;
  } catch {
    return null;
  }
}
