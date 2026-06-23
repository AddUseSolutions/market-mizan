-- ZAR→ETB rate locked at first_seen (Just Property lists in ZAR)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS fx_rate_zar_etb NUMERIC(12,6);
