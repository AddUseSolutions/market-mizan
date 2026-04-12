#!/usr/bin/env node
/**
 * Legt Tabellen in PostgreSQL an (schema.postgres.sql).
 * Nutzung: DATABASE_URL=postgres://... npm run db:migrate
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const databaseUrl = process.env.DATABASE_URL || "";
if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) {
  console.error("DATABASE_URL muss eine PostgreSQL-URL sein (postgres:// oder postgresql://).");
  process.exit(1);
}

const sqlPath = path.join(__dirname, "..", "db", "schema.postgres.sql");
const raw = fs.readFileSync(sqlPath, "utf8");
const chunks = raw.match(/[^;]+;/g) || [];

function stripLeadingComments(block) {
  return block
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
}

async function main() {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 2,
    ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }
  });
  try {
    for (const chunk of chunks) {
      const stmt = stripLeadingComments(chunk).trim();
      if (!stmt) continue;
      await pool.query(stmt);
    }
    console.log("OK: PostgreSQL-Schema aus schema.postgres.sql angewendet.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
