-- Full feedback sprint: workflow, history, reviews, confirmations

ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS location_area VARCHAR(255);
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS location_city VARCHAR(100) DEFAULT 'Addis Ababa';
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS images JSONB;
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS ai_description TEXT;
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS reviewed_by INT;
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS published_property_id VARCHAR(50);

ALTER TABLE properties ADD COLUMN IF NOT EXISTS hmlo_score VARCHAR(20);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_per_sqm_usd NUMERIC(12,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS user_confirmations INT NOT NULL DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_verified_check TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR(50) NOT NULL,
    price_etb NUMERIC(15,2),
    price_usd NUMERIC(15,2),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_reviews (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR(50) NOT NULL,
    user_id INT,
    reviewer_email VARCHAR(254) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listing_confirmations (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR(50) NOT NULL,
    user_id INT,
    confirmer_email VARCHAR(254) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(property_id, confirmer_email)
);

CREATE INDEX IF NOT EXISTS idx_price_history_property ON price_history(property_id);
CREATE INDEX IF NOT EXISTS idx_property_reviews_property ON property_reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_listing_confirmations_property ON listing_confirmations(property_id);
