# Market Mizan — Crawling & Listing Lifecycle Policy

This document answers customer feedback items **#41–45** and **#52** for the initial release.

## Crawled listings

| Rule | Implementation |
|------|----------------|
| Remove when no longer on source | Scraper sets `is_active = FALSE` when URL is missing from sync (`deactivate_orphans_not_in_sync`) or after repeated `not_found` errors (`SCRAPER_NOT_FOUND_DEACTIVATE_AFTER_FAILS`, default 2). |
| Maximum age | Optional policy: deactivate crawled listings older than **365 days** (configurable; not automated in v1 — run manual SQL or add cron in Phase 4). |
| Data stored | Upload date (`first_seen`), initial price ETB + USD at FX rate of day, source reference, bedrooms/bathrooms, up to **6 images**, factual summary description (not full source copy). |
| Default classification | `listing_origin = crawled`, `verification_status = unverified`, `publisher_type = unknown`. |
| Trusted partner crawl | **Just Property** (`just.property`, Addis Ababa filter): imported with `verification_status = verified`, `publisher_type = broker`, `listing_origin = crawled`. |

## Verified listings (landlord/broker submissions)

| Rule | Target process |
|------|----------------|
| Verification | Admin reviews `listing_submissions` and publishes with `verification_status = verified`, `listing_origin = verified`. |
| Re-check availability | Monthly email to contact on file (manual/automated — Phase 4). |
| Immediate removal | Owner/agent uses **Request removal** on detail page → email to `CONTACT_TO_EMAIL`. |

## Transition crawled → verified

1. User confirms listing is still active (future crowdsourcing — Phase 4).
2. Admin or landlord submits via **List your property** with proof.
3. Row upgraded: `verification_status = verified`, `verified_at = NOW()`, optional `is_paid` / `publisher_type`.

## Ranking on homepage

Verified paid broker → verified paid landlord → verified unpaid broker → verified unpaid landlord → verified crawled → unverified crawled (by `first_seen`).

See `backend/utils/listingRank.js` for SQL sort order.
