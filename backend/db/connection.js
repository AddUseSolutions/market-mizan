const mysql = require("mysql2/promise");
const { Pool } = require("pg");
require("dotenv").config();

function envOrDefault(value, fallback) {
  return value && String(value).trim() !== "" ? value : fallback;
}

const databaseUrl = process.env.DATABASE_URL || "";
const usePg = /^postgres(ql)?:\/\//i.test(databaseUrl);

function adaptSqlForPostgres(sql) {
  return sql.replace(/\bCURRENT_DATE\s*\(\s*\)/gi, "CURRENT_DATE");
}

function mysqlParamsToPg(sql, params = []) {
  let i = 0;
  const text = sql.replace(/\?/g, () => `$${++i}`);
  return { text, values: params };
}

const mysqlPool = mysql.createPool({
  host: envOrDefault(process.env.DB_HOST, "localhost"),
  port: Number(envOrDefault(process.env.DB_PORT, 3306)),
  database: envOrDefault(process.env.DB_NAME, "market_mizan"),
  user: envOrDefault(process.env.DB_USER, "root"),
  password: envOrDefault(process.env.DB_PASSWORD, "root"),
  waitForConnections: true,
  connectionLimit: 10
});

let pgPool = null;
if (usePg) {
  pgPool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }
  });
}

/**
 * MySQL-kompatibel: liefert [rows] wie mysql2/promise .query()
 */
async function query(sql, params = []) {
  if (usePg) {
    const sqlPg = adaptSqlForPostgres(sql);
    const { text, values } = mysqlParamsToPg(sqlPg, params);
    const result = await pgPool.query(text, values);
    return [result.rows];
  }
  return mysqlPool.query(sql, params);
}

module.exports = {
  query,
  dialect: usePg ? "postgres" : "mysql",
  /** Legacy: direkter Pool-Zugriff nur für MySQL-Tools */
  mysqlPool: usePg ? null : mysqlPool
};
