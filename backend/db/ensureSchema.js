const bcrypt = require("bcryptjs");
const { query, dialect } = require("./connection");

/**
 * Bestehende DBs: fehlende Spalten nachziehen.
 * MySQL: ER_DUP_FIELDNAME (1060) ignorieren.
 * PostgreSQL: IF NOT EXISTS.
 */
async function ensurePropertiesSchema() {
  if (dialect === "postgres") {
    const [existsRows] = await query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'properties'
      ) AS ex`
    );
    if (!existsRows?.[0]?.ex) {
      console.warn(
        "PostgreSQL: Tabelle properties fehlt — bitte einmalig Schema anlegen: npm run db:migrate (mit DATABASE_URL)"
      );
      return;
    }
    await query(
      "ALTER TABLE properties ADD COLUMN IF NOT EXISTS source_listing_updated VARCHAR(512)"
    );
    await query("ALTER TABLE properties ALTER COLUMN location_district TYPE VARCHAR(512)");
    await query(
      "ALTER TABLE properties ADD COLUMN IF NOT EXISTS location_area VARCHAR(255)"
    );
    await query(
      "ALTER TABLE properties ADD COLUMN IF NOT EXISTS detail_url_normalized VARCHAR(2048)"
    );
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_id INT");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS views_count INT NOT NULL DEFAULT 0");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_scraped BOOLEAN NOT NULL DEFAULT TRUE");
    await query("UPDATE properties SET is_scraped = TRUE WHERE is_scraped IS NULL");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_etb NUMERIC(15,2)");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_usd NUMERIC(15,2)");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS fx_rate_etb_usd NUMERIC(12,6)");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS fx_rate_date DATE");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS fx_rate_zar_etb NUMERIC(12,6)");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS fx_rate_zar_usd NUMERIC(12,6)");
    await query(
      "ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_origin VARCHAR(20) NOT NULL DEFAULT 'crawled'"
    );
    await query(
      "ALTER TABLE properties ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified'"
    );
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE");
    await query(
      "ALTER TABLE properties ADD COLUMN IF NOT EXISTS publisher_type VARCHAR(20) NOT NULL DEFAULT 'unknown'"
    );
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS description_original TEXT");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS description_summary TEXT");
    await query(
      `UPDATE properties SET description_summary = description
       WHERE description_summary IS NULL AND description IS NOT NULL AND TRIM(description) <> ''`
    );
    await query("UPDATE properties SET price_etb = price WHERE price_etb IS NULL AND price IS NOT NULL");
    return;
  }

  try {
    await query(
      "ALTER TABLE properties ADD COLUMN source_listing_updated VARCHAR(512) NULL AFTER description"
    );
  } catch (e) {
    if (e.errno !== 1060) throw e;
  }
  await query("ALTER TABLE properties MODIFY COLUMN location_district VARCHAR(512) NULL");
  try {
    await query(
      "ALTER TABLE properties ADD COLUMN location_area VARCHAR(255) NULL AFTER location_city"
    );
  } catch (e) {
    if (e.errno !== 1060) throw e;
  }
  try {
    await query(
      "ALTER TABLE properties ADD COLUMN detail_url_normalized VARCHAR(2048) NULL AFTER detail_url"
    );
  } catch (e) {
    if (e.errno !== 1060) throw e;
  }
  try {
    await query("ALTER TABLE properties ADD COLUMN owner_id INT NULL AFTER source_name");
  } catch (e) {
    if (e.errno !== 1060) throw e;
  }
  try {
    await query("ALTER TABLE properties ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER updated_at");
  } catch (e) {
    if (e.errno !== 1060) throw e;
  }
  try {
    await query("ALTER TABLE properties ADD COLUMN views_count INT NOT NULL DEFAULT 0 AFTER images");
  } catch (e) {
    if (e.errno !== 1060) throw e;
  }
  try {
    await query("ALTER TABLE properties ADD COLUMN is_scraped BOOLEAN NOT NULL DEFAULT TRUE AFTER views_count");
  } catch (e) {
    if (e.errno !== 1060) throw e;
  }
  await query("UPDATE properties SET is_scraped = TRUE WHERE is_scraped IS NULL");
  const mysqlCols = [
    ["price_etb", "DECIMAL(15,2) NULL AFTER price"],
    ["price_usd", "DECIMAL(15,2) NULL AFTER price_etb"],
    ["fx_rate_etb_usd", "DECIMAL(12,6) NULL AFTER price_usd"],
    ["fx_rate_date", "DATE NULL AFTER fx_rate_etb_usd"],
    ["fx_rate_zar_etb", "DECIMAL(12,6) NULL AFTER fx_rate_date"],
    ["fx_rate_zar_usd", "DECIMAL(12,6) NULL AFTER fx_rate_zar_etb"],
    ["listing_origin", "VARCHAR(20) NOT NULL DEFAULT 'crawled'"],
    ["verification_status", "VARCHAR(20) NOT NULL DEFAULT 'unverified'"],
    ["is_paid", "BOOLEAN NOT NULL DEFAULT FALSE"],
    ["publisher_type", "VARCHAR(20) NOT NULL DEFAULT 'unknown'"],
    ["verified_at", "TIMESTAMP NULL"],
    ["description_original", "TEXT NULL"],
    ["description_summary", "TEXT NULL"]
  ];
  for (const [col, def] of mysqlCols) {
    try {
      await query(`ALTER TABLE properties ADD COLUMN ${col} ${def}`);
    } catch (e) {
      if (e.errno !== 1060) throw e;
    }
  }
  await query("UPDATE properties SET price_etb = price WHERE price_etb IS NULL AND price IS NOT NULL");
  await query(
    `UPDATE properties SET description_summary = description
     WHERE description_summary IS NULL AND description IS NOT NULL AND TRIM(description) <> ''`
  );
}

async function ensureUsersSchema() {
  if (dialect === "postgres") {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(254) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'INTERESTED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'INTERESTED'");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)");
    await query("UPDATE users SET role='INTERESTED' WHERE LOWER(role)='user'");
    await query("UPDATE users SET role='ADMIN' WHERE LOWER(role)='admin'");
    await query("UPDATE users SET role='SELLER' WHERE LOWER(role)='seller'");
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(254) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'INTERESTED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      await query("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'INTERESTED'");
    } catch (e) {
      if (e.errno !== 1060) throw e;
    }
    try {
      await query("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    } catch (e) {
      if (e.errno !== 1060) throw e;
    }
    try {
      await query("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)");
    } catch (e) {
      if (e.errno !== 1060) throw e;
    }
    await query("UPDATE users SET role='INTERESTED' WHERE LOWER(role)='user'");
    await query("UPDATE users SET role='ADMIN' WHERE LOWER(role)='admin'");
    await query("UPDATE users SET role='SELLER' WHERE LOWER(role)='seller'");
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@mmizan.local").trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "admin1234");
  const [existingRows] = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [adminEmail]);
  if (existingRows.length > 0) return;

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await query(
    "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'ADMIN')",
    [adminEmail, passwordHash]
  );
  console.log(`Admin user erstellt: ${adminEmail}`);
}

async function ensureListingSubmissionsSchema() {
  if (dialect === "postgres") {
    await query(`
      CREATE TABLE IF NOT EXISTS listing_submissions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        listing_mode VARCHAR(30) NOT NULL,
        property_type VARCHAR(50) NOT NULL,
        price NUMERIC(15,2) NOT NULL,
        size_m2 NUMERIC(10,2) NOT NULL,
        rooms INT NOT NULL,
        available_from VARCHAR(30) NOT NULL,
        contact_name VARCHAR(120) NOT NULL,
        contact_email VARCHAR(254) NOT NULL,
        contact_phone VARCHAR(40),
        latitude NUMERIC(10,8) NOT NULL,
        longitude NUMERIC(11,8) NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const subCols = [
      "property_category VARCHAR(30)",
      "land_area_m2 NUMERIC(10,2)",
      "bedrooms INT",
      "bathrooms INT",
      "kitchens INT",
      "living_rooms INT",
      "maid_bedrooms INT",
      "maid_bathrooms INT",
      "price_etb NUMERIC(15,2)",
      "price_usd NUMERIC(15,2)",
      "fx_rate_etb_usd NUMERIC(12,6)",
      "fx_rate_date DATE",
      "ai_title_suggestion VARCHAR(500)"
    ];
    for (const col of subCols) {
      await query(`ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS ${col}`);
    }
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS listing_submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      listing_mode VARCHAR(30) NOT NULL,
      property_type VARCHAR(50) NOT NULL,
      price DECIMAL(15,2) NOT NULL,
      size_m2 DECIMAL(10,2) NOT NULL,
      rooms INT NOT NULL,
      available_from VARCHAR(30) NOT NULL,
      contact_name VARCHAR(120) NOT NULL,
      contact_email VARCHAR(254) NOT NULL,
      contact_phone VARCHAR(40),
      latitude DECIMAL(10,8) NOT NULL,
      longitude DECIMAL(11,8) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const subColsMysql = [
    ["property_category", "VARCHAR(30) NULL"],
    ["land_area_m2", "DECIMAL(10,2) NULL"],
    ["bedrooms", "INT NULL"],
    ["bathrooms", "INT NULL"],
    ["kitchens", "INT NULL"],
    ["living_rooms", "INT NULL"],
    ["maid_bedrooms", "INT NULL"],
    ["maid_bathrooms", "INT NULL"],
    ["price_etb", "DECIMAL(15,2) NULL"],
    ["price_usd", "DECIMAL(15,2) NULL"],
    ["fx_rate_etb_usd", "DECIMAL(12,6) NULL"],
    ["fx_rate_date", "DATE NULL"],
    ["ai_title_suggestion", "VARCHAR(500) NULL"]
  ];
  for (const [col, def] of subColsMysql) {
    try {
      await query(`ALTER TABLE listing_submissions ADD COLUMN ${col} ${def}`);
    } catch (e) {
      if (e.errno !== 1060) throw e;
    }
  }
}

async function ensureInquiriesSchema() {
  if (dialect === "postgres") {
    await query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      property_id INT NOT NULL,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function ensureFeedbackSchema() {
  if (dialect === "postgres") {
    await query("ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending'");
    await query("ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS location_area VARCHAR(255)");
    await query("ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS location_city VARCHAR(100) DEFAULT 'Addis Ababa'");
    await query("ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS images JSONB");
    await query("ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS ai_description TEXT");
    await query("ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS description_original TEXT");
    await query("ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS description_summary TEXT");
    await query("ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ");
    await query("ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS reviewed_by INT");
    await query("ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS rejection_reason TEXT");
    await query("ALTER TABLE listing_submissions ADD COLUMN IF NOT EXISTS published_property_id VARCHAR(50)");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS hmlo_score VARCHAR(20)");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_per_sqm_usd NUMERIC(12,2)");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS user_confirmations INT NOT NULL DEFAULT 0");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_verified_check TIMESTAMPTZ");
    await query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR(50) NOT NULL,
        price_etb NUMERIC(15,2),
        price_usd NUMERIC(15,2),
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS property_reviews (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR(50) NOT NULL,
        user_id INT,
        reviewer_email VARCHAR(254) NOT NULL,
        rating INT NOT NULL,
        comment TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS listing_confirmations (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR(50) NOT NULL,
        user_id INT,
        confirmer_email VARCHAR(254) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(property_id, confirmer_email)
      )
    `);
    return;
  }

  const subExtra = [
    ["status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"],
    ["location_area", "VARCHAR(255) NULL"],
    ["location_city", "VARCHAR(100) NULL"],
    ["images", "JSON NULL"],
    ["ai_description", "TEXT NULL"],
    ["description_original", "TEXT NULL"],
    ["description_summary", "TEXT NULL"],
    ["reviewed_at", "TIMESTAMP NULL"],
    ["reviewed_by", "INT NULL"],
    ["rejection_reason", "TEXT NULL"],
    ["published_property_id", "VARCHAR(50) NULL"]
  ];
  for (const [col, def] of subExtra) {
    try { await query(`ALTER TABLE listing_submissions ADD COLUMN ${col} ${def}`); } catch (e) { if (e.errno !== 1060) throw e; }
  }
  const propExtra = [
    ["hmlo_score", "VARCHAR(20) NULL"],
    ["price_per_sqm_usd", "DECIMAL(12,2) NULL"],
    ["user_confirmations", "INT NOT NULL DEFAULT 0"],
    ["last_verified_check", "TIMESTAMP NULL"]
  ];
  for (const [col, def] of propExtra) {
    try { await query(`ALTER TABLE properties ADD COLUMN ${col} ${def}`); } catch (e) { if (e.errno !== 1060) throw e; }
  }
  await query(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      property_id VARCHAR(50) NOT NULL,
      price_etb DECIMAL(15,2),
      price_usd DECIMAL(15,2),
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS property_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      property_id VARCHAR(50) NOT NULL,
      user_id INT,
      reviewer_email VARCHAR(254) NOT NULL,
      rating INT NOT NULL,
      comment TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS listing_confirmations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      property_id VARCHAR(50) NOT NULL,
      user_id INT,
      confirmer_email VARCHAR(254) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_confirm (property_id, confirmer_email)
    )
  `);
}

async function ensureSourcesSeed() {
  if (dialect === "postgres") {
    await query(
      `INSERT INTO sources (name, base_url, scraper_class, is_active, created_at)
       SELECT 'Just Property', 'https://www.just.property', 'RealEthioScraper', TRUE, NOW()
       WHERE NOT EXISTS (
         SELECT 1 FROM sources WHERE base_url = 'https://www.just.property'
       )`
    );
    return;
  }
  await query(
    `INSERT IGNORE INTO sources (name, base_url, scraper_class, is_active)
     VALUES ('Just Property', 'https://www.just.property', 'RealEthioScraper', TRUE)`
  );
}

async function ensureHolisticLeadsSchema() {
  if (dialect === "postgres") {
    await query(`
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
      )
    `);
    await query("CREATE INDEX IF NOT EXISTS idx_holistic_leads_created ON holistic_leads(created_at DESC)");
    await query("CREATE INDEX IF NOT EXISTS idx_holistic_leads_property ON holistic_leads(property_id)");
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS holistic_leads (
      id INT AUTO_INCREMENT PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

module.exports = {
  ensurePropertiesSchema,
  ensureUsersSchema,
  ensureListingSubmissionsSchema,
  ensureInquiriesSchema,
  ensureFeedbackSchema,
  ensureHolisticLeadsSchema,
  ensureSourcesSeed
};
