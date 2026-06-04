-- Mizan RBAC schema (PostgreSQL / Supabase-compatible)
-- Applied automatically via ensureRbacSchema.js on API startup.
-- Full migrate: cd backend && npm run db:migrate

CREATE TABLE IF NOT EXISTS user_roles (
    code VARCHAR(30) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO user_roles (code, label, description) VALUES
  ('ADMIN', 'Administrator', 'Full system control, moderation, manual listing verification'),
  ('AGENCY_BROKER', 'Agency / Broker', 'Broker dashboards, bulk uploads, lead management'),
  ('PRIVATE_LANDLORD', 'Private landlord', 'Simple listing upload for property owners'),
  ('PREMIUM_BUYER', 'Premium buyer', 'Protected market analytics and woreda price trends'),
  ('STANDARD_USER', 'Standard user', 'Watchlists, contact brokers, crowdsource listing status')
ON CONFLICT (code) DO NOTHING;

-- users.role references user_roles.code logically (VARCHAR FK optional for simpler migrations)

CREATE TABLE IF NOT EXISTS agency_profiles (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    agency_name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    website VARCHAR(500),
    office_address TEXT,
    bulk_upload_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS landlord_profiles (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(200),
    preferred_contact VARCHAR(50) DEFAULT 'email',
    audio_upload_ready BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS premium_subscriptions (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(30) NOT NULL DEFAULT 'premium',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_favorites (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_property ON user_favorites(property_id);

CREATE TABLE IF NOT EXISTS listing_crowd_flags (
    id SERIAL PRIMARY KEY,
    property_id VARCHAR(50) NOT NULL,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flag_type VARCHAR(30) NOT NULL DEFAULT 'inactive',
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (property_id, user_id, flag_type)
);

CREATE INDEX IF NOT EXISTS idx_listing_crowd_flags_property ON listing_crowd_flags(property_id);
