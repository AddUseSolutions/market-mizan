CREATE DATABASE IF NOT EXISTS market_mizan;
USE market_mizan;

CREATE TABLE IF NOT EXISTS properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id VARCHAR(50) UNIQUE NOT NULL,
    owner_id INT NULL,
    source_website VARCHAR(100),
    source_name VARCHAR(100),
    detail_url TEXT,
    title VARCHAR(500),
    price DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'ETB',
    property_size_m2 DECIMAL(10,2),
    land_area_m2 DECIMAL(10,2),
    bedrooms INT,
    bathrooms INT,
    garage INT,
    property_type VARCHAR(100),
    property_status VARCHAR(100),
    floor INT,
    furnished BOOLEAN DEFAULT FALSE,
    features JSON,
    images JSON,
    views_count INT NOT NULL DEFAULT 0,
    is_scraped BOOLEAN DEFAULT TRUE,
    google_maps_url TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    location_city VARCHAR(100) DEFAULT 'Addis Ababa',
    location_area VARCHAR(255),
    location_district VARCHAR(512),
    description TEXT,
    source_listing_updated VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    scraper_class VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_scraped TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scrape_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_website VARCHAR(100),
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    properties_found INT DEFAULT 0,
    properties_new INT DEFAULT 0,
    properties_updated INT DEFAULT 0,
    properties_deactivated INT DEFAULT 0,
    status VARCHAR(50),
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'INTERESTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listing_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    listing_mode VARCHAR(30) NOT NULL,
    property_type VARCHAR(50) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    size_m2 DECIMAL(10,2) NOT NULL,
    rooms INT NOT NULL,
    available_from VARCHAR(30) NOT NULL,
    contact_name VARCHAR(120) NOT NULL,
    contact_email VARCHAR(254) NOT NULL,
    contact_phone VARCHAR(40),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO sources (id, name, base_url, scraper_class) VALUES
(1, 'RealEthio', 'https://realethio.com', 'RealEthioScraper');
