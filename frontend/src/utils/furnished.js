export function isFurnished(property) {
  const raw = property?.furnished ?? property?.is_furnished ?? property?.furnishing;
  if (raw == null || raw === "") return false;

  if (raw === true || raw === 1 || raw === "1") return true;
  if (raw === false || raw === 0 || raw === "0") return false;

  const text = String(raw).trim().toLowerCase();
  if (text === "true" || text === "yes" || text === "furnished") return true;
  if (text === "false" || text === "no" || text === "unfurnished" || text === "not furnished") {
    return false;
  }

  return false;
}

export function formatFurnishedStatus(property, t) {
  return isFurnished(property) ? t("furnishedYes") : t("furnishedNo");
}
