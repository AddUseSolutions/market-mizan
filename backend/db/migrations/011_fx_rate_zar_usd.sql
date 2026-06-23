-- ZAR→USD rate locked at first_seen (Just Property site FX)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS fx_rate_zar_usd NUMERIC(12,6);
