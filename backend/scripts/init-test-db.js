#!/usr/bin/env node
/**
 * Creates the test database schema for PostgreSQL.
 * Uses TEST_DATABASE_URL (Neon) or TEST_DB_* env vars (never uses production DB).
 * Usage: node scripts/init-test-db.js
 * Local: npm run db:test:setup
 */
require("dotenv").config({ path: ".env.test" });
require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const host = process.env.TEST_DB_HOST || process.env.DB_HOST || "localhost";
const port = process.env.TEST_DB_PORT || process.env.DB_PORT || "5432";
const user = process.env.TEST_DB_USER || process.env.DB_USER || "postgres";
const password = process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || "postgres";
const dbName = process.env.TEST_DB_NAME || "swimcenter_test";

const baseUrl = `postgresql://${user}:${password}@${host}:${port}`;
const connectionString =
  process.env.TEST_DATABASE_URL ||
  `${baseUrl}/${dbName}`;

async function initTestDb() {
  if (!process.env.TEST_DATABASE_URL) {
    const adminPool = new Pool({ connectionString: `${baseUrl}/postgres` });
    try {
      const r = await adminPool.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [dbName]
      );
      if (r.rows.length === 0) {
        await adminPool.query(`CREATE DATABASE ${dbName}`);
        console.log(`Database ${dbName} created.`);
      }
    } catch (e) {
      const msg = e.code === "ECONNREFUSED"
        ? "Cannot connect to PostgreSQL. Is the service running? (" + host + ":" + (port || 5432) + ")"
        : (e.message || e.code || e);
      console.error("Error creating test DB:", msg);
      process.exit(1);
    } finally {
      await adminPool.end();
    }
  }

  const pool = new Pool({ connectionString });
  try {
    const schemaPath = path.join(__dirname, "../sql/schema_postgres.sql");
    const sql = fs.readFileSync(schemaPath, "utf8");
    await pool.query(sql);
    console.log("Test database schema created successfully.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initTestDb();
