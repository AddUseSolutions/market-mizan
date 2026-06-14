/**
 * Map raw DB property_type strings into a grouped hierarchy for filter UI.
 */

const NOISE = /^[-–—_\s]+$/i;

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function classifyType(raw) {
  const t = normalizeKey(raw);
  if (!t || NOISE.test(t)) return null;

  if (/land|plot|agricultural/.test(t)) {
    if (/commercial/.test(t)) return { group: "Land", label: "Commercial Land", value: raw };
    if (/agricultural|farm/.test(t)) return { group: "Land", label: "Agricultural Land", value: raw };
    return { group: "Land", label: "Residential Land", value: raw };
  }

  if (/commercial|office|shop|retail|warehouse|hotel|building for sale|building for rent/.test(t)) {
    if (/office/.test(t)) return { group: "Commercial", label: "Office", value: raw };
    if (/shop|retail|store/.test(t)) return { group: "Commercial", label: "Shop / Retail", value: raw };
    if (/hotel/.test(t)) return { group: "Commercial", label: "Hotel", value: raw };
    if (/warehouse|industrial/.test(t)) return { group: "Commercial", label: "Warehouse", value: raw };
    if (/building/.test(t)) return { group: "Commercial", label: "Commercial Building", value: raw };
    return { group: "Commercial", label: "Commercial", value: raw };
  }

  if (/studio/.test(t)) return { group: "Residential", label: "Studio", value: raw };
  if (/room|shared/.test(t)) return { group: "Residential", label: "Room", value: raw };
  if (/villa|house|townhouse|duplex|g\+|g \+/.test(t)) {
    return { group: "Residential", label: "Villa / House", value: raw };
  }
  if (/apartment|condo|flat|unit/.test(t)) {
    return { group: "Residential", label: "Apartment / Condo", value: raw };
  }

  return { group: "Residential", label: String(raw).trim(), value: raw };
}

/** Group key sent to API — expands to multiple LIKE patterns on backend. */
export const TYPE_GROUP_PATTERNS = {
  residential_apartment: ["%apartment%", "%condo%", "%flat%"],
  residential_villa: ["%villa%", "%house%", "%townhouse%", "%duplex%"],
  residential_studio: ["%studio%"],
  residential_room: ["%room%"],
  commercial_office: ["%office%"],
  commercial_shop: ["%shop%", "%retail%", "%store%"],
  commercial_building: ["%commercial%building%", "%building%commercial%"],
  commercial_hotel: ["%hotel%"],
  commercial_warehouse: ["%warehouse%", "%industrial%"],
  land_residential: ["%residential%land%", "%land%residential%", "%plot%"],
  land_commercial: ["%commercial%land%", "%land%commercial%"],
  land_agricultural: ["%agricultural%", "%farm%"],
};

export const GROUPED_TYPE_OPTIONS = [
  {
    categoryKey: "categoryResidential",
    options: [
      { labelKey: "typeApartmentCondo", groupKey: "residential_apartment" },
      { labelKey: "typeVillaHouse", groupKey: "residential_villa" },
      { labelKey: "typeStudio", groupKey: "residential_studio" },
      { labelKey: "typeRoom", groupKey: "residential_room" },
    ],
  },
  {
    categoryKey: "categoryCommercial",
    options: [
      { labelKey: "typeOffice", groupKey: "commercial_office" },
      { labelKey: "typeShopRetail", groupKey: "commercial_shop" },
      { labelKey: "typeCommercialBuilding", groupKey: "commercial_building" },
      { labelKey: "typeHotel", groupKey: "commercial_hotel" },
      { labelKey: "typeWarehouse", groupKey: "commercial_warehouse" },
    ],
  },
  {
    categoryKey: "categoryLand",
    options: [
      { labelKey: "typeResidentialLand", groupKey: "land_residential" },
      { labelKey: "typeCommercialLand", groupKey: "land_commercial" },
      { labelKey: "typeAgriculturalLand", groupKey: "land_agricultural" },
    ],
  },
];

/**
 * Build grouped select options from raw DB types.
 * Returns { grouped: [{category, options:[{label,value}]}], flatValues: Set }
 */
export function buildPropertyTypeOptions(rawTypes = []) {
  const byGroup = new Map();
  const seenLabels = new Set();

  for (const raw of rawTypes) {
    const classified = classifyType(raw);
    if (!classified) continue;
    const dedupeKey = `${classified.group}::${classified.label}`;
    if (seenLabels.has(dedupeKey)) continue;
    seenLabels.add(dedupeKey);

    if (!byGroup.has(classified.group)) byGroup.set(classified.group, []);
    byGroup.get(classified.group).push({
      label: classified.label,
      value: classified.value,
    });
  }

  const order = ["Residential", "Commercial", "Land"];
  const grouped = order
    .filter((g) => byGroup.has(g))
    .map((category) => ({
      category,
      options: byGroup.get(category).sort((a, b) => a.label.localeCompare(b.label)),
    }));

  return { grouped, hasRaw: grouped.length > 0 };
}

/** Resolve URL param: group key or legacy exact property_type. */
export function resolveTypeFilterParam(value) {
  if (!value) return { property_type: "", property_type_group: "" };
  if (TYPE_GROUP_PATTERNS[value]) return { property_type: "", property_type_group: value };
  return { property_type: value, property_type_group: "" };
}
