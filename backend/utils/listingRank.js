const { dialect } = require("../db/connection");

/** Former Just Property crawl host — listings reassigned to EPM still keep this website key. */
function isJustPropertyWebsiteSql() {
  return `LOWER(COALESCE(source_website, '')) LIKE '%just.property%'`;
}

/** Trusted partner broker: EPM Global (and legacy Just Property rows). */
function isEpmPartnerSql() {
  return `(
    ${isJustPropertyWebsiteSql()}
    OR LOWER(COALESCE(source_name, '')) LIKE '%epm%'
    OR LOWER(COALESCE(source_name, '')) LIKE '%just property%'
  )`;
}

/** @deprecated use isEpmPartnerSql — kept for callers that still import the old name */
function isJustPropertySql() {
  return isEpmPartnerSql();
}

/** Verified EPM/partner listings first, then other verified, then the rest. */
function verifiedTierSql() {
  return `
    CASE
      WHEN COALESCE(verification_status, 'unverified') = 'verified'
           AND ${isEpmPartnerSql()} THEN 0
      WHEN COALESCE(verification_status, 'unverified') = 'verified' THEN 1
      ELSE 2
    END
  `;
}

function rankedOrderSql() {
  const priceCol = "COALESCE(price_usd, price)";
  const missingRank = `(CASE WHEN ${priceCol} IS NULL OR ${priceCol} <= 0 THEN 1 ELSE 0 END)`;
  const verifiedAt = dialect === "postgres" ? "verified_at DESC NULLS LAST" : "verified_at IS NULL, verified_at DESC";
  return `${missingRank} ASC, ${priceCol} DESC, ${verifiedAt}, first_seen DESC`;
}

function priceMissingLastSql(direction) {
  const priceCol = "COALESCE(price_usd, price)";
  const missingRank = `(CASE WHEN ${priceCol} IS NULL OR ${priceCol} <= 0 THEN 1 ELSE 0 END)`;
  if (direction === "asc") return `${missingRank} ASC, ${priceCol} ASC`;
  return `${missingRank} ASC, ${priceCol} DESC`;
}

function withVerifiedFirst(secondaryOrder) {
  return `${verifiedTierSql()} ASC, ${secondaryOrder}`;
}

function resolveOrderBy(sort) {
  if (sort === "price_asc") return withVerifiedFirst(priceMissingLastSql("asc"));
  if (sort === "price_desc") return withVerifiedFirst(priceMissingLastSql("desc"));
  if (sort === "size_desc") return withVerifiedFirst("property_size_m2 DESC");
  if (sort === "ranked") return withVerifiedFirst(rankedOrderSql());
  return withVerifiedFirst("first_seen DESC");
}

module.exports = {
  rankedOrderSql,
  resolveOrderBy,
  verifiedTierSql,
  isJustPropertySql,
  isEpmPartnerSql
};
