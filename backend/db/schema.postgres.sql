-- PostgreSQL schema for Market Mizan (Render, Docker, lokal mit PG)
-- Einmal ausfuehren: cd backend && npm run db:migrate  (DATABASE_URL setzen)

CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR(50) UNIQUE NOT NULL,
    source_website VARCHAR(100),
    source_name VARCHAR(100),
    detail_url TEXT,
    title VARCHAR(500),
    price NUMERIC(15,2),
    currency VARCHAR(10) DEFAULT 'ETB',
    property_size_m2 NUMERIC(10,2),
    land_area_m2 NUMERIC(10,2),
    bedrooms INT,
    bathrooms INT,
    garage INT,
    property_type VARCHAR(100),
    property_status VARCHAR(100),
    floor INT,
    furnished BOOLEAN DEFAULT FALSE,
    features JSONB,
    images JSONB,
    google_maps_url TEXT,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    location_city VARCHAR(100) DEFAULT 'Addis Ababa',
    location_area VARCHAR(255),
    location_district VARCHAR(512),
    description TEXT,
    source_listing_updated VARCHAR(512),
    is_active BOOLEAN DEFAULT TRUE,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    scraper_class VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_scraped TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scrape_logs (
    id SERIAL PRIMARY KEY,
    source_website VARCHAR(100),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    properties_found INT DEFAULT 0,
    properties_new INT DEFAULT 0,
    properties_updated INT DEFAULT 0,
    properties_deactivated INT DEFAULT 0,
    status VARCHAR(50),
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    phone VARCHAR(40),
    password_hash VARCHAR(255),
    provider VARCHAR(20) NOT NULL DEFAULT 'local',
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listing_submissions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    listing_mode VARCHAR(30) NOT NULL,
    property_type VARCHAR(50) NOT NULL,
    price NUMERIC(15,2) NOT NULL,
    size_m2 NUMERIC(10,2) NOT NULL,
    rooms INT NOT NULL,
    available_from VARCHAR(30) NOT NULL,
    contact_name VARCHAR(120) NOT NULL,
    contact_email VARCHAR(254) NOT NULL,
    contact_phone VARCHAR(40),
    latitude NUMERIC(10,8) NOT NULL,
    longitude NUMERIC(11,8) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sources (id, name, base_url, scraper_class, is_active, created_at)
VALUES (1, 'RealEthio', 'https://realethio.com', 'RealEthioScraper', TRUE, NOW())
ON CONFLICT (id) DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('sources', 'id'),
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM sources), 1)
);
