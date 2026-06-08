-- Split listing descriptions: full original text vs AI summary

ALTER TABLE properties ADD COLUMN IF NOT EXISTS description_original TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS description_summary TEXT;

ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS description_original TEXT;
ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS description_summary TEXT;

-- Legacy: old `description` column held fact-based summaries from the scraper
UPDATE properties
SET description_summary = description
WHERE description_summary IS NULL
  AND description IS NOT NULL
  AND TRIM(description) <> '';

UPDATE listing_submissions
SET description_summary = ai_description
WHERE description_summary IS NULL
  AND ai_description IS NOT NULL
  AND TRIM(ai_description) <> '';

UPDATE listing_submissions
SET description_original = notes
WHERE description_original IS NULL
  AND notes IS NOT NULL
  AND TRIM(notes) <> '';
