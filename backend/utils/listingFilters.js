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
  land_agricultural: ["%agricultural%", "%farm%"]
};

const DEFAULT_CITY = "Addis Ababa";
/** Rent USD/m² above this is a bad size or a sale mislabeled as rent. */
const MAX_PPS_RENT_USD = 50;
/** Sale USD/m² above this is dropped. A typical Addis sale is near $1,000/m². */
const MAX_PPS_SALE_USD = 8000;

/**
 * USD for filters, sort, and histograms.
 * `price` and `price_etb` are birr. Never read them as dollars.
 * Prefer birr at the current FX rate so a stale stored price_usd (locked at 130)
 * cannot overstate rent. Just Property keeps its ZAR-derived USD.
 */
function usdEstimateSql(etbPerUsd = 161) {
  const rate = Number(etbPerUsd);
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 161;
  const etb = "COALESCE(NULLIF(price_etb, 0), NULLIF(price, 0))";
  const isJustProperty = `LOWER(COALESCE(source_website, '')) LIKE '%just.property%'`;
  return `CASE
    WHEN ${isJustProperty} AND NULLIF(price_usd, 0) IS NOT NULL THEN NULLIF(price_usd, 0)
    WHEN ${etb} IS NOT NULL THEN ${etb} / ${safeRate}
    ELSE NULLIF(price_usd, 0)
  END`;
}

/** True when status column clearly says rent / to-let. */
function rentalStatusColumnSql() {
  return `(
    LOWER(COALESCE(property_status, '')) LIKE '%rent%'
    OR LOWER(COALESCE(property_status, '')) LIKE '%to let%'
    OR LOWER(COALESCE(property_status, '')) LIKE '%to-let%'
  )`;
}

/**
 * Rent detection for filters + price caps.
 * Many RealEthio / EthiopiaRealty rows lost property_status; titles still say "For Rent".
 */
function rentalStatusSql() {
  return `(
    ${rentalStatusColumnSql()}
    OR (
      TRIM(COALESCE(property_status, '')) = ''
      AND (
        LOWER(COALESCE(title, '')) LIKE '%for rent%'
        OR LOWER(COALESCE(title, '')) LIKE '%to let%'
        OR LOWER(COALESCE(title, '')) LIKE '%to-let%'
        OR LOWER(COALESCE(title, '')) LIKE '%for lease%'
        OR LOWER(COALESCE(detail_url, '')) LIKE '%for-rent%'
        OR LOWER(COALESCE(detail_url, '')) LIKE '%to-let%'
      )
    )
  )`;
}

/** Title/URL sale cues when property_status is empty. */
function saleTitleFallbackSql() {
  return `(
    LOWER(COALESCE(title, '')) LIKE '%for sale%'
    OR LOWER(COALESCE(title, '')) LIKE '%urgent sale%'
    OR LOWER(COALESCE(title, '')) LIKE '% in sale%'
    OR LOWER(COALESCE(title, '')) LIKE '%sale %'
    OR LOWER(COALESCE(title, '')) LIKE '% sale'
    OR LOWER(COALESCE(detail_url, '')) LIKE '%for-sale%'
    OR LOWER(COALESCE(detail_url, '')) LIKE '%urgent-sale%'
    OR LOWER(COALESCE(detail_url, '')) LIKE '%-in-sale%'
  )`;
}

/**
 * Sale detection for listing_mode=for_sale.
 * Prefer status; fall back to title/URL; EthiopiaRealty defaults to sale when not clearly rent.
 */
function saleStatusSql() {
  return `(
    LOWER(COALESCE(property_status, '')) LIKE '%sale%'
    OR (
      TRIM(COALESCE(property_status, '')) = ''
      AND NOT (${rentalStatusSql()})
      AND (
        ${saleTitleFallbackSql()}
        OR LOWER(COALESCE(source_website, '')) = 'ethiopiarealty.com'
      )
    )
  )`;
}

/**
 * Infer For Rent / For Sale from free text (title, URL, etc.).
 * @param {string} text
 * @param {{ sourceWebsite?: string }} [opts]
 * @returns {"For Rent"|"For Sale"|null}
 */
function inferListingStatusFromText(text, opts = {}) {
  const t = String(text || "").toLowerCase();
  if (!t.trim() && !opts.sourceWebsite) return null;
  const rent =
    /\bfor\s*rent\b/.test(t) ||
    /\bto[\s-]?let\b/.test(t) ||
    /\bfor\s*lease\b/.test(t) ||
    /\/to-let\//.test(t) ||
    /for-rent/.test(t);
  const sale =
    /\bfor\s*sale\b/.test(t) ||
    /\burgent\s+sale\b/.test(t) ||
    /\bin\s+sale\b/.test(t) ||
    /\/for-sale\//.test(t) ||
    /urgent-sale/.test(t) ||
    /(?:^|[^a-z])sale(?:[^a-z]|$)/.test(t);
  if (rent && !sale) return "For Rent";
  if (sale && !rent) return "For Sale";
  if (rent) return "For Rent";
  if (sale) return "For Sale";
  // EthiopiaRealty inventory is overwhelmingly for sale when status/title omit the mode.
  if (String(opts.sourceWebsite || "").toLowerCase() === "ethiopiarealty.com") {
    return "For Sale";
  }
  return null;
}

/**
 * True when a listing has a usable public price (for ranking / analytics).
 * Missing prices are still browsable — they show as "Price on request".
 */
function hasPublicPriceSql(etbPerUsd = Number(process.env.FX_ETB_USD || 130)) {
  const usd = usdEstimateSql(etbPerUsd);
  const etb = `COALESCE(price_etb, price)`;
  return `(
    (
      ${rentalStatusSql()} AND (
        (${etb} IS NOT NULL AND ${etb} >= 8000)
        OR (${usd} IS NOT NULL AND ${usd} >= 80)
      )
    )
    OR (
      NOT (${rentalStatusSql()}) AND (
        (${etb} IS NOT NULL AND ${etb} >= 500000)
        OR (${usd} IS NOT NULL AND ${usd} >= 8000)
      )
    )
  )`;
}

/**
 * Hide only absurd POSITIVE prices from public search.
 * Missing / zero prices stay visible as "Price on request" (ranked lower).
 * Prefer ETB when present — a stale/wrong price_usd must not hide a valid ETB price.
 * - Rent: hide below ~ETB 8k/mo (typos like 2,500) and above ~USD 50k/mo
 * - Sale: hide below ETB 500k and above ETB 500M (Addis luxury often 30M–200M+)
 */
function priceCapClause(etbPerUsd = Number(process.env.FX_ETB_USD || 130)) {
  const usd = usdEstimateSql(etbPerUsd);
  const etb = `COALESCE(price_etb, price)`;
  return `NOT (
    (${rentalStatusSql()} AND (
      (${usd} IS NOT NULL AND ${usd} > 50000)
      OR (
        CASE
          WHEN ${etb} IS NOT NULL AND ${etb} > 0 THEN (${etb} < 8000)
          ELSE (${usd} IS NOT NULL AND ${usd} > 0 AND ${usd} < 80)
        END
      )
    ))
    OR
    (NOT ${rentalStatusSql()} AND (
      (${etb} IS NOT NULL AND ${etb} > 500000000)
      OR (
        CASE
          WHEN ${etb} IS NOT NULL AND ${etb} > 0 THEN (${etb} < 500000)
          ELSE (${usd} IS NOT NULL AND ${usd} > 0 AND ${usd} < 4000)
        END
      )
    ))
  )`;
}

function propertyClassSql() {
  const t = `LOWER(CONCAT(COALESCE(property_type, ''), ' ', COALESCE(title, '')))`;
  return `CASE
    WHEN ${t} LIKE '%land%' OR ${t} LIKE '%plot%' OR ${t} LIKE '%agricultural%' OR ${t} LIKE '%farm %' OR ${t} LIKE '% farm%'
      THEN 'land'
    WHEN ${t} LIKE '%office%' THEN 'office'
    WHEN ${t} LIKE '%shop%' OR ${t} LIKE '%retail%' OR ${t} LIKE '%store%' THEN 'shop'
    WHEN ${t} LIKE '%warehouse%' OR ${t} LIKE '%industrial%' OR ${t} LIKE '%hotel%' THEN 'other'
    WHEN ${t} LIKE '%apartment%' OR ${t} LIKE '%condo%' OR ${t} LIKE '%flat%' OR ${t} LIKE '%studio%'
      THEN 'apartment'
    WHEN ${t} LIKE '%villa%' OR ${t} LIKE '%townhouse%' OR ${t} LIKE '%duplex%'
      OR ${t} LIKE '%g+%' OR ${t} LIKE '%g +%'
      OR (${t} LIKE '%house%' AND ${t} NOT LIKE '%warehouse%') THEN 'house'
    ELSE 'other'
  END`;
}

function listingModeSql() {
  return `CASE
    WHEN ${rentalStatusSql()} THEN 'rent'
    WHEN ${saleStatusSql()} THEN 'sale'
    ELSE NULL
  END`;
}

/** House sale and land use the plot. Everything else uses living area, then land. */
function areaM2Sql(classExpr, modeExpr) {
  return `CASE
    WHEN ${classExpr} = 'land' THEN COALESCE(NULLIF(land_area_m2, 0), NULLIF(property_size_m2, 0))
    WHEN ${classExpr} = 'house' AND ${modeExpr} = 'sale'
      THEN COALESCE(NULLIF(land_area_m2, 0), NULLIF(property_size_m2, 0))
    ELSE COALESCE(NULLIF(property_size_m2, 0), NULLIF(land_area_m2, 0))
  END`;
}

function hasImagesSql(dialect) {
  return dialect === "postgres"
    ? `(images IS NOT NULL AND images::text NOT IN ('[]', 'null', '') AND LENGTH(TRIM(images::text)) > 2)`
    : `(images IS NOT NULL AND JSON_LENGTH(images) > 0)`;
}

/** Furnished flag or clear wording, excluding "unfurnished". */
function furnishedListingSql(dialect = "postgres") {
  const featuresText =
    dialect === "postgres"
      ? `COALESCE(features::text, '')`
      : `COALESCE(CAST(features AS CHAR), '')`;
  const blob = `LOWER(CONCAT(COALESCE(title, ''), ' ', COALESCE(description, ''), ' ', COALESCE(description_original, ''), ' ', ${featuresText}))`;
  return `(
    furnished IS TRUE
    OR (
      ${blob} LIKE '%furnished%'
      AND ${blob} NOT LIKE '%unfurnished%'
      AND ${blob} NOT LIKE '%un-furnished%'
      AND ${blob} NOT LIKE '%not furnished%'
    )
  )`;
}

/**
 * One row per source URL. A priced copy wins over an empty copy of the same page.
 * Rows with no URL stay, because they are not duplicates of each other.
 * One pass over the table. A per-row lookup here stalls the public list.
 */
function canonicalDetailUrlSql() {
  const priced = `COALESCE(NULLIF(price_usd, 0), NULLIF(price_etb, 0), NULLIF(price, 0)) IS NOT NULL`;
  return `(
    NULLIF(TRIM(COALESCE(detail_url, '')), '') IS NULL
    OR id IN (
      SELECT ranked.id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY detail_url
                 ORDER BY CASE WHEN ${priced} THEN 0 ELSE 1 END, id DESC
               ) AS rn
        FROM properties
        WHERE is_active = TRUE
          AND NULLIF(TRIM(COALESCE(detail_url, '')), '') IS NOT NULL
      ) ranked
      WHERE ranked.rn = 1
    )
  )`;
}

/** Same rows the public site lists: Addis, real title, photo or verified, plausible price, one row per URL. */
function publicCatalogWhereSql(dialect = "postgres") {
  const city = DEFAULT_CITY.replace(/'/g, "");
  return [
    "is_active = TRUE",
    `LOWER(TRIM(COALESCE(NULLIF(TRIM(location_city), ''), '${city}'))) = LOWER('${city}')`,
    "(title IS NOT NULL AND TRIM(title) <> '' AND title NOT LIKE 'Listing %')",
    `NOT (${junkTitleSql(dialect)})`,
    `(${hasImagesSql(dialect)} OR LOWER(COALESCE(verification_status, 'unverified')) = 'verified')`,
    priceCapClause(),
    canonicalDetailUrlSql()
  ].join("\n  AND ");
}

function hasStoredPrice(row) {
  const usd = Number(row?.price_usd);
  const etb = Number(row?.price_etb);
  const raw = Number(row?.price);
  return (Number.isFinite(usd) && usd > 0) || (Number.isFinite(etb) && etb > 0) || (Number.isFinite(raw) && raw > 0);
}

function listingId(row) {
  const ref = String(row?.listing_ref || "");
  const fromRef = /^MM(\d+)$/i.exec(ref);
  if (fromRef) return Number(fromRef[1]);
  const id = Number(row?.id);
  return Number.isFinite(id) ? id : 0;
}

/** JS twin of canonicalDetailUrlSql, for tests and offline recounts. */
function chooseCanonicalListings(rows) {
  const groups = new Map();
  const kept = [];
  for (const row of rows || []) {
    const url = String(row?.detail_url || "").trim();
    if (!url) {
      kept.push(row);
      continue;
    }
    const list = groups.get(url) || [];
    list.push(row);
    groups.set(url, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => {
      const ap = hasStoredPrice(a) ? 0 : 1;
      const bp = hasStoredPrice(b) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return listingId(b) - listingId(a);
    });
    kept.push(list[0]);
  }
  return kept;
}

function classifyListingJs(row) {
  const t = `${row?.property_type || ""} ${row?.title || ""}`.toLowerCase();
  if (/land|plot|agricultural|\bfarm\b/.test(t)) return "land";
  if (/office/.test(t)) return "office";
  if (/shop|retail|\bstore\b/.test(t)) return "shop";
  if (/warehouse|industrial|\bhotel\b/.test(t)) return "other";
  if (/apartment|condo|flat|studio/.test(t)) return "apartment";
  if (/villa|townhouse|duplex|g\+|g \+|\bhouse\b/.test(t) && !/warehouse/.test(t)) return "house";
  return "other";
}

function listingModeJs(row) {
  const status = String(row?.property_status || "").toLowerCase();
  const title = `${row?.title || ""} ${row?.detail_url || ""}`.toLowerCase();
  const rent =
    status.includes("rent") ||
    status.includes("to let") ||
    status.includes("to-let") ||
    (!status.trim() && /for rent|to[\s-]?let|for lease|for-rent|to-let/.test(title));
  if (rent) return "rent";
  if (status.includes("sale")) return "sale";
  if (!status.trim() && /for sale|urgent sale|for-sale|urgent-sale/.test(title)) return "sale";
  if (!status.trim() && String(row?.source_website || "").toLowerCase() === "ethiopiarealty.com") return "sale";
  return "";
}

function usdOfListing(row, etbPerUsd = 161) {
  const rate = Number(etbPerUsd) > 0 ? Number(etbPerUsd) : 161;
  const storedUsd = Number(row?.price_usd);
  const etb = Number(row?.price_etb) > 0 ? Number(row.price_etb) : Number(row?.price);
  const isJustProperty = String(row?.source_website || "").toLowerCase().includes("just.property");
  if (isJustProperty && Number.isFinite(storedUsd) && storedUsd > 0) return storedUsd;
  if (Number.isFinite(etb) && etb > 0) return etb / rate;
  if (Number.isFinite(storedUsd) && storedUsd > 0) return storedUsd;
  return null;
}

function areaM2OfListing(row) {
  const mode = listingModeJs(row);
  const kind = classifyListingJs(row);
  const living = Number(row?.property_size_m2);
  const land = Number(row?.land_area_m2);
  const livingOk = Number.isFinite(living) && living > 0 ? living : null;
  const landOk = Number.isFinite(land) && land > 0 ? land : null;
  if (kind === "land" || (kind === "house" && mode === "sale")) return landOk || livingOk;
  return livingOk || landOk;
}

/** USD/m² used by the map and the market index. Null when the figure is missing or past the cap. */
function ppsUsdOfListing(row, etbPerUsd = 130) {
  const mode = listingModeJs(row);
  const usd = usdOfListing(row, etbPerUsd);
  const area = areaM2OfListing(row);
  if (!mode || !usd || !area) return null;
  const pps = usd / area;
  const cap = mode === "rent" ? MAX_PPS_RENT_USD : MAX_PPS_SALE_USD;
  if (!(pps > 0) || pps > cap) return null;
  return pps;
}

/** SQL fragment: placeholder / keyboard-mash titles from source sites ("Auto Draft", "Jnknklnkj", "85551 2"). */
function junkTitleSql(dialect) {
  if (dialect === "postgres") {
    return `(LOWER(TRIM(title)) IN ('auto draft', 'draft', 'test', 'untitled') OR title ~ '^[0-9[:space:][:punct:]]+$' OR (LENGTH(TRIM(title)) >= 6 AND title !~* '[aeiouy]'))`;
  }
  return `(LOWER(TRIM(title)) IN ('auto draft', 'draft', 'test', 'untitled') OR title REGEXP '^[0-9[:space:][:punct:]]+$' OR (CHAR_LENGTH(TRIM(title)) >= 6 AND LOWER(title) NOT REGEXP '[aeiouy]'))`;
}

/** SQL fragment: active rows with implausible prices (for maintenance deactivate). */
function implausiblePriceWhereSql(etbPerUsd = Number(process.env.FX_ETB_USD || 130)) {
  const usd = usdEstimateSql(etbPerUsd);
  const etb = `COALESCE(price_etb, price)`;
  return `(
    (${rentalStatusSql()} AND (
      (${etb} IS NOT NULL AND ${etb} > 0 AND ${etb} < 8000)
      OR (${usd} IS NOT NULL AND ${usd} > 0 AND ${usd} < 80)
    ))
    OR
    (NOT ${rentalStatusSql()} AND ${etb} IS NOT NULL AND ${etb} > 0 AND ${etb} < 500000)
  )`;
}

module.exports = {
  TYPE_GROUP_PATTERNS,
  DEFAULT_CITY,
  MAX_PPS_RENT_USD,
  MAX_PPS_SALE_USD,
  priceCapClause,
  hasPublicPriceSql,
  usdEstimateSql,
  implausiblePriceWhereSql,
  junkTitleSql,
  rentalStatusSql,
  saleStatusSql,
  inferListingStatusFromText,
  propertyClassSql,
  listingModeSql,
  areaM2Sql,
  hasImagesSql,
  furnishedListingSql,
  canonicalDetailUrlSql,
  publicCatalogWhereSql,
  chooseCanonicalListings,
  classifyListingJs,
  listingModeJs,
  usdOfListing,
  areaM2OfListing,
  ppsUsdOfListing
};
