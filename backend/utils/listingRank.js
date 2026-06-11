const { dialect } = require("../db/connection");

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

function resolveOrderBy(sort) {
  if (sort === "price_asc") return priceMissingLastSql("asc");
  if (sort === "price_desc") return priceMissingLastSql("desc");
  if (sort === "size_desc") return "property_size_m2 DESC";
  if (sort === "ranked") return rankedOrderSql();
  return "first_seen DESC";
}

module.exports = { rankedOrderSql, resolveOrderBy };
