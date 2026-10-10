/** Internal Market Mizan listing reference ("MM" + numeric id), e.g. MM1234. */
export function getListingRef(property) {
  if (!property) return "";
  if (property.listing_ref) return property.listing_ref;
  const n = Number(property.id);
  return Number.isInteger(n) && n > 0 ? `MM${n}` : "";
}

export function isListingRef(value) {
  return /^#?mm[\s-]*\d{1,9}$/i.test(String(value ?? "").trim());
}
