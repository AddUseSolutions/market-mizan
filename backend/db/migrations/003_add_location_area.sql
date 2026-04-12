USE market_mizan;
ALTER TABLE properties
  ADD COLUMN location_area VARCHAR(255) NULL AFTER location_city;
