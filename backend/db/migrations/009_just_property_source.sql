-- Just Property (Addis Ababa rentals, verified on crawl)
INSERT INTO sources (name, base_url, scraper_class, is_active, created_at)
SELECT 'Just Property', 'https://www.just.property', 'RealEthioScraper', TRUE, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM sources WHERE base_url = 'https://www.just.property'
);
