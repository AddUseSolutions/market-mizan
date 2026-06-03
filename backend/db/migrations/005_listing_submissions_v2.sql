-- Extended listing submission fields (PostgreSQL)
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS property_category VARCHAR(30);
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS land_area_m2 NUMERIC(10,2);
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS bedrooms INT;
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS bathrooms INT;
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS kitchens INT;
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS living_rooms INT;
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS maid_bedrooms INT;
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS maid_bathrooms INT;
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS price_etb NUMERIC(15,2);
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS price_usd NUMERIC(15,2);
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS fx_rate_etb_usd NUMERIC(12,6);
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS fx_rate_date DATE;
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS ai_title_suggestion VARCHAR(500);
