#!/usr/bin/env node
/**
 * Initializes the PostgreSQL database with schema.
 * Usage: DATABASE_URL=postgresql://... node scripts/init-db.js
 * Or with .env: node scripts/init-db.js
 * Works with local PostgreSQL and Neon (DATABASE_URL).
 */
require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const host = process.env.DB_HOST || "localhost";
const port = process.env.DB_PORT || 5432;
const user = process.env.DB_USER || "postgres";
const password = process.env.DB_PASSWORD || "";
const dbName = process.env.DB_NAME || "swimcenter";

const baseUrl = `postgresql://${user}:${password}@${host}:${port}`;
const connectionString = process.env.DATABASE_URL || `${baseUrl}/${dbName}`;

async function initDb() {
  if (!process.env.DATABASE_URL) {
    const adminPool = new Pool({ connectionString: `${baseUrl}/postgres` });
    try {
      const r = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
      if (r.rows.length === 0) {
        await adminPool.query(`CREATE DATABASE ${dbName}`);
        console.log(`Database ${dbName} created.`);
      }
    } catch (e) {
      console.error("Error creating DB:", e.message);
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
    console.log("Database schema created successfully.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
