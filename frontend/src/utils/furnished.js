export function formatFurnishedStatus(property, t) {
  const raw = property?.furnished ?? property?.is_furnished ?? property?.furnishing;
  if (raw == null || raw === "") return "—";

  if (raw === true || raw === 1 || raw === "1") return t("furnishedYes");
  if (raw === false || raw === 0 || raw === "0") return t("furnishedNo");

  const text = String(raw).trim().toLowerCase();
  if (text === "true" || text === "yes" || text === "furnished") return t("furnishedYes");
  if (text === "false" || text === "no" || text === "unfurnished" || text === "not furnished") {
    return t("furnishedNo");
  }

  return String(raw);
}
