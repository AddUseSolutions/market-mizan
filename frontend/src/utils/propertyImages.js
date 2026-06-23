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

export function propertyImageThumb(property) {
  const list = parsePropertyImages(property);
  return list[0] || null;
}
