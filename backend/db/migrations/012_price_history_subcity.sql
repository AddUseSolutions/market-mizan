-- Price history indexes + document subcity dashboard grouping (canonical_area).
-- Applied at boot via ensureFeedbackSchema / ensurePropertiesSchema (IF NOT EXISTS).

CREATE INDEX IF NOT EXISTS idx_price_history_property ON price_history(property_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded ON price_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_price_history_property_recorded ON price_history(property_id, recorded_at);

-- Market / HMLO dashboard categories use:
--   TRIM(COALESCE(NULLIF(canonical_area, ''), NULLIF(location_area, ''), …))
-- so stats align with the 11 official Addis Ababa sub-cities.
