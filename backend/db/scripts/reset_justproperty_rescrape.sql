-- Force re-scrape of all Just Property listings (clears freshness + bad FX/price data).
-- Run against production DB before the next Render cron, or locally:
--   psql "$DATABASE_URL" -f backend/db/scripts/reset_justproperty_rescrape.sql

UPDATE properties
SET
  scraped_at = NULL,
  price = NULL,
  price_etb = NULL,
  price_usd = NULL,
  fx_rate_zar_etb = NULL,
  fx_rate_zar_usd = NULL,
  fx_rate_etb_usd = NULL,
  fx_rate_date = NULL,
  currency = 'ETB'
WHERE source_website = 'just.property';

-- Optional: inspect how many rows will be picked up on next crawl
-- SELECT COUNT(*) FROM properties WHERE source_website = 'just.property' AND is_active = TRUE;
