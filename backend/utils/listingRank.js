const { dialect } = require("../db/connection");

function isJustPropertySql() {
  return `(
    LOWER(COALESCE(source_website, '')) LIKE '%just.property%'
    OR LOWER(COALESCE(source_name, '')) LIKE '%just property%'
  )`;
}

/** Verified Just Property first, then other verified, then the rest. */
function verifiedTierSql() {
  return `
    CASE
      WHEN COALESCE(verification_status, 'unverified') = 'verified'
           AND ${isJustPropertySql()} THEN 0
      WHEN COALESCE(verification_status, 'unverified') = 'verified' THEN 1
      ELSE 2
    END
  `;
}

function rankedOrderSql() {
  const rankCase = `
    CASE
      WHEN COALESCE(verification_status, 'unverified') = 'verified'
           AND COALESCE(is_paid, FALSE) = TRUE
           AND COALESCE(publisher_type, 'unknown') = 'broker' THEN 10
      WHEN COALESCE(verification_status, 'unverified') = 'verified'
           AND COALESCE(is_paid, FALSE) = TRUE
           AND COALESCE(publisher_type, 'unknown') = 'landlord' THEN 20
      WHEN COALESCE(verification_status, 'unverified') = 'verified'
           AND COALESCE(is_paid, FALSE) = FALSE
           AND COALESCE(publisher_type, 'unknown') = 'broker' THEN 30
      WHEN COALESCE(verification_status, 'unverified') = 'verified'
           AND COALESCE(is_paid, FALSE) = FALSE
           AND COALESCE(publisher_type, 'unknown') = 'landlord' THEN 40
      WHEN COALESCE(listing_origin, 'crawled') = 'crawled'
           AND COALESCE(verification_status, 'unverified') = 'verified' THEN 50
      ELSE 60
    END
  `;
  const verifiedAt = dialect === "postgres" ? "verified_at DESC NULLS LAST" : "verified_at IS NULL, verified_at DESC";
  return `${rankCase} ASC, ${verifiedAt}, first_seen DESC`;
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

module.exports = { rankedOrderSql, resolveOrderBy, verifiedTierSql, isJustPropertySql };
