export function omitEmptyParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    })
  );
}
