#!/usr/bin/env node
require("dotenv").config({ path: ".env.test" });
require("dotenv").config();
const { Pool } = require("pg");

const host = process.env.TEST_DB_HOST || "localhost";
const port = process.env.TEST_DB_PORT || "5432";
const user = process.env.TEST_DB_USER || "postgres";
const pass = process.env.TEST_DB_PASSWORD || "";
const connStr = process.env.TEST_DATABASE_URL || `postgresql://${user}:${pass}@${host}:${port}/postgres`;

async function check() {
  const pool = new Pool({ connectionString: connStr });
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL OK (" + host + ":" + port + ")");
    process.exit(0);
  } catch (e) {
    if (e.code === "ECONNREFUSED") {
      console.error("PostgreSQL not responding (" + host + ":" + port + ").");
      console.error("   Windows: Services → postgresql → Start");
    } else {
      console.error("Connection error:", e.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}
check();
