-- USD pricing + listing ranking fields (PostgreSQL)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_etb NUMERIC(15,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_usd NUMERIC(15,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS fx_rate_etb_usd NUMERIC(12,6);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS fx_rate_date DATE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_origin VARCHAR(20) NOT NULL DEFAULT 'crawled';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS publisher_type VARCHAR(20) NOT NULL DEFAULT 'unknown';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

UPDATE properties SET price_etb = price WHERE price_etb IS NULL AND price IS NOT NULL;
UPDATE properties SET listing_origin = 'crawled' WHERE listing_origin IS NULL;
UPDATE properties SET verification_status = 'unverified' WHERE verification_status IS NULL;
UPDATE properties SET publisher_type = 'unknown' WHERE publisher_type IS NULL;
UPDATE properties SET is_paid = FALSE WHERE is_paid IS NULL;
