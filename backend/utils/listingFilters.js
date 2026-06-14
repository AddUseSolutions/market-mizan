/** Patterns for grouped property type filter (property_type_group query param). */
const TYPE_GROUP_PATTERNS = {
  residential_apartment: ["%apartment%", "%condo%", "%flat%"],
  residential_villa: ["%villa%", "%house%", "%townhouse%", "%duplex%"],
  residential_studio: ["%studio%"],
  residential_room: ["%room%"],
  commercial_office: ["%office%"],
  commercial_shop: ["%shop%", "%retail%", "%store%"],
  commercial_building: ["%commercial%building%", "%building%commercial%", "%building for sale%", "%building for rent%"],
  commercial_hotel: ["%hotel%"],
  commercial_warehouse: ["%warehouse%", "%industrial%"],
  land_residential: ["%residential%land%", "%land%residential%", "%plot%"],
  land_commercial: ["%commercial%land%", "%land%commercial%"],
  land_agricultural: ["%agricultural%", "%farm%"],
};

/** Hide rent listings over 50k USD/mo and sale listings over 30M ETB. */
function priceCapClause() {
  return `NOT (
    (LOWER(COALESCE(property_status, '')) LIKE '%rent%' AND COALESCE(price_usd, price) > 50000)
    OR
    (LOWER(COALESCE(property_status, '')) LIKE '%sale%' AND COALESCE(price_etb, price) > 30000000)
  )`;
}

module.exports = { TYPE_GROUP_PATTERNS, priceCapClause };
