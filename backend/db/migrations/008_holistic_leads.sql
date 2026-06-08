-- Holistic / property contact leads for dashboard widgets

CREATE TABLE IF NOT EXISTS holistic_leads (
    id SERIAL PRIMARY KEY,
    lead_type VARCHAR(30) NOT NULL DEFAULT 'holistic',
    service_label VARCHAR(120),
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(40),
    message TEXT,
    property_id VARCHAR(50),
    property_title VARCHAR(300),
    detail_url TEXT,
    property_address VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holistic_leads_created ON holistic_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_holistic_leads_property ON holistic_leads(property_id);
