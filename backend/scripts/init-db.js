#!/usr/bin/env node
/**
 * Initializes the PostgreSQL database with schema.
 * Usage: DATABASE_URL=postgresql://... node scripts/init-db.js
 * Or with .env: node scripts/init-db.js
 */
require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || "postgres"}:${process.env.DB_PASSWORD || ""}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || "swimcenter"}`;

async function initDb() {
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
