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
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_id INT");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS views_count INT NOT NULL DEFAULT 0");
    await query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_scraped BOOLEAN NOT NULL DEFAULT TRUE");
    await query("UPDATE properties SET is_scraped = TRUE WHERE is_scraped IS NULL");
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

module.exports = {
  ensurePropertiesSchema,
  ensureUsersSchema,
  ensureListingSubmissionsSchema,
  ensureInquiriesSchema
};
