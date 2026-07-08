const { query, dialect } = require("./connection");
const { ROLES } = require("../constants/roles");

async function seedUserRoles() {
  const rows = [
    [ROLES.ADMIN, "Administrator", "Full system control, moderation, manual listing verification"],
    [ROLES.AGENCY_BROKER, "Agency / Broker", "Broker dashboards, bulk uploads, lead management"],
    [ROLES.PRIVATE_LANDLORD, "Private landlord", "Simple listing upload for property owners"],
    [ROLES.PREMIUM_BUYER, "Premium buyer", "Protected market analytics and woreda price trends"],
    [ROLES.STANDARD_USER, "Standard user", "Watchlists, contact brokers, crowdsource listing status"]
  ];

  for (const [code, label, description] of rows) {
    if (dialect === "postgres") {
      await query(
        `INSERT INTO user_roles (code, label, description)
         VALUES (?, ?, ?)
         ON CONFLICT (code) DO NOTHING`,
        [code, label, description]
      );
    } else {
      await query(
        `INSERT IGNORE INTO user_roles (code, label, description) VALUES (?, ?, ?)`,
        [code, label, description]
      );
    }
  }
}

async function migrateUserRoles() {
  const migrations = [
    ["INTERESTED", ROLES.STANDARD_USER],
    ["USER", ROLES.STANDARD_USER],
    ["SELLER", ROLES.PRIVATE_LANDLORD],
    ["ADMIN", ROLES.ADMIN]
  ];
  for (const [from, to] of migrations) {
    await query("UPDATE users SET role = ? WHERE UPPER(role) = ?", [to, from]);
  }
  await query("UPDATE users SET role = ? WHERE role IS NULL OR TRIM(role) = ''", [ROLES.STANDARD_USER]);
}

async function ensureRbacSchema() {
  if (dialect === "postgres") {
    await query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        code VARCHAR(30) PRIMARY KEY,
        label VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(40)");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    await query("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(30)");
    await query("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'STANDARD_USER'");

    await query(`
      CREATE TABLE IF NOT EXISTS agency_profiles (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        agency_name VARCHAR(255) NOT NULL,
        license_number VARCHAR(100),
        website VARCHAR(500),
        office_address TEXT,
        bulk_upload_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        auto_verify_listings BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query("ALTER TABLE agency_profiles ADD COLUMN IF NOT EXISTS auto_verify_listings BOOLEAN NOT NULL DEFAULT FALSE");

    await query(`
      CREATE TABLE IF NOT EXISTS landlord_profiles (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        display_name VARCHAR(200),
        preferred_contact VARCHAR(50) DEFAULT 'email',
        audio_upload_ready BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS premium_subscriptions (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        tier VARCHAR(30) NOT NULL DEFAULT 'premium',
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, property_id)
      )
    `);
    await query("CREATE INDEX IF NOT EXISTS idx_user_favorites_property ON user_favorites(property_id)");

    await query(`
      CREATE TABLE IF NOT EXISTS listing_crowd_flags (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR(50) NOT NULL,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        flag_type VARCHAR(30) NOT NULL DEFAULT 'inactive',
        comment TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (property_id, user_id, flag_type)
      )
    `);
    await query("CREATE INDEX IF NOT EXISTS idx_listing_crowd_flags_property ON listing_crowd_flags(property_id)");
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        code VARCHAR(30) PRIMARY KEY,
        label VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const userCols = [
      ["first_name", "VARCHAR(100) NULL"],
      ["last_name", "VARCHAR(100) NULL"],
      ["phone", "VARCHAR(40) NULL"],
      ["is_active", "BOOLEAN NOT NULL DEFAULT TRUE"],
      ["updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"]
    ];
    for (const [col, def] of userCols) {
      try {
        await query(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
      } catch (e) {
        if (e.errno !== 1060) throw e;
      }
    }
    try {
      await query("ALTER TABLE users MODIFY COLUMN role VARCHAR(30) NOT NULL DEFAULT 'STANDARD_USER'");
    } catch (e) {
      if (e.errno !== 1060) throw e;
    }

    await query(`
      CREATE TABLE IF NOT EXISTS agency_profiles (
        user_id INT PRIMARY KEY,
        agency_name VARCHAR(255) NOT NULL,
        license_number VARCHAR(100),
        website VARCHAR(500),
        office_address TEXT,
        bulk_upload_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        auto_verify_listings BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    try {
      await query("ALTER TABLE agency_profiles ADD COLUMN auto_verify_listings BOOLEAN NOT NULL DEFAULT FALSE");
    } catch (e) {
      if (e.errno !== 1060) throw e;
    }

    await query(`
      CREATE TABLE IF NOT EXISTS landlord_profiles (
        user_id INT PRIMARY KEY,
        display_name VARCHAR(200),
        preferred_contact VARCHAR(50) DEFAULT 'email',
        audio_upload_ready BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS premium_subscriptions (
        user_id INT PRIMARY KEY,
        tier VARCHAR(30) NOT NULL DEFAULT 'premium',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        user_id INT NOT NULL,
        property_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, property_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS listing_crowd_flags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        property_id VARCHAR(50) NOT NULL,
        user_id INT NOT NULL,
        flag_type VARCHAR(30) NOT NULL DEFAULT 'inactive',
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_crowd_flag (property_id, user_id, flag_type),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  await seedUserRoles();
  await migrateUserRoles();
}

module.exports = { ensureRbacSchema };
