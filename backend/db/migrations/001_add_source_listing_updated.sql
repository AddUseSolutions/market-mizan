-- Run once if your database was created before this column existed.
USE market_mizan;
ALTER TABLE properties
  ADD COLUMN source_listing_updated VARCHAR(512) NULL AFTER description;
