/** Normalize property.images from API (array or JSON string). */
export function parsePropertyImages(propertyOrImages) {
  const raw = propertyOrImages?.images ?? propertyOrImages;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "[]" || trimmed === "null") return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

const MEDIA_URL_RE = /\/api\/media\/[a-f0-9]{32}$/;

/** Market Mizan uploads: "sm" is a 960 px card variant of the full-quality gallery image. */
export function mediaVariant(url, variant = "lg") {
  if (typeof url !== "string" || variant === "lg" || !MEDIA_URL_RE.test(url)) return url;
  return `${url}/${variant}`;
}

export function propertyImageThumb(property) {
  const list = parsePropertyImages(property);
  return list[0] ? mediaVariant(list[0], "sm") : null;
}
