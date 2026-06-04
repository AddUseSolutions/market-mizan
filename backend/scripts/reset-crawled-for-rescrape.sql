-- Soft reset: mark crawled listings for full re-scrape (keeps rows, verified listings untouched).
-- Run on Render PostgreSQL shell, then start scraper with SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS=0.

UPDATE properties
SET scraped_at = NULL,
    last_scrape_error_at = NULL,
    last_scrape_error_type = NULL
WHERE listing_origin = 'crawled';

-- Check progress after scraper runs:
-- SELECT COUNT(*) FROM properties WHERE listing_origin = 'crawled' AND scraped_at IS NULL;
