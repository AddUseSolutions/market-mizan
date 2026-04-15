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
}

async function ensureUsersSchema() {
  if (dialect === "postgres") {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(80) NOT NULL,
        last_name VARCHAR(80) NOT NULL,
        email VARCHAR(254) UNIQUE NOT NULL,
        phone VARCHAR(40),
        password_hash VARCHAR(255),
        provider VARCHAR(20) NOT NULL DEFAULT 'local',
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(80) NOT NULL,
        last_name VARCHAR(80) NOT NULL,
        email VARCHAR(254) NOT NULL UNIQUE,
        phone VARCHAR(40),
        password_hash VARCHAR(255) NULL,
        provider VARCHAR(20) NOT NULL DEFAULT 'local',
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@mmizan.local").trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "admin1234");
  const [existingRows] = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [adminEmail]);
  if (existingRows.length > 0) return;

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await query(
    "INSERT INTO users (first_name, last_name, email, password_hash, provider, role) VALUES (?, ?, ?, ?, 'local', 'admin')",
    ["System", "Admin", adminEmail, passwordHash]
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

module.exports = { ensurePropertiesSchema, ensureUsersSchema, ensureListingSubmissionsSchema };
