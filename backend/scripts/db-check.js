#!/usr/bin/env node
/**
 * PostgreSQL connection diagnostics - check why connection fails
 * npm run db:check
 */
require("dotenv").config({ path: ".env.test" });
require("dotenv").config();

const host = process.env.TEST_DB_HOST || process.env.DB_HOST || "localhost";
const port = process.env.TEST_DB_PORT || process.env.DB_PORT || "5432";
const user = process.env.TEST_DB_USER || process.env.DB_USER || "postgres";
const dbName = process.env.TEST_DB_NAME || "swimcenter_test";

console.log("--- PostgreSQL Connection Check ---\n");
console.log("Using:");
console.log("  DB_HOST:", host);
console.log("  DB_PORT:", port);
console.log("  DB_USER:", user);
console.log("  DB_NAME:", dbName);
console.log("  TEST_DATABASE_URL:", process.env.TEST_DATABASE_URL ? "(set)" : "(not set)");
console.log("  .env.test loaded:", !!(process.env.TEST_DB_HOST || process.env.TEST_DB_PORT));
console.log("  .env DB_HOST:", process.env.DB_HOST || "(default localhost)");
console.log("");

const possibleCauses = [
  "1. PostgreSQL service may be stopped",
  "2. Another program may be listening on port 5432 (conflict)",
  "3. If DB_HOST=xxx.neon.tech in .env, connecting to cloud not local",
  "4. PostgreSQL may be installed on different port (5433, 5434)",
  "5. On Windows: postgresql-x64-XX service not 'Running'"
];

console.log("Possible causes:");
possibleCauses.forEach((c) => console.log("  ", c));
console.log("");

const { Pool } = require("pg");
const connStr = process.env.TEST_DATABASE_URL || `postgresql://${user}:${process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || "postgres"}@${host}:${port}/${dbName}`;

(async () => {
  try {
    const pool = new Pool({ connectionString: connStr, connectionTimeoutMillis: 3000 });
    await pool.query("SELECT 1");
    console.log("✓ Connection successful!");
    await pool.end();
  } catch (e) {
    console.log("Error:", e.code || "?", e.message);
    if (e.code === "ECONNREFUSED") {
      console.log("\n→ ECONNREFUSED: Nothing listening on " + host + ":" + port);
      console.log("  Start PostgreSQL: Services -> postgresql-x64-XX -> Start");
      console.log("  Or: pg_ctl -D \"C:\\Program Files\\PostgreSQL\\17\\data\" start");
    }
    if (e.code === "ENOTFOUND") {
      console.log("\n→ ENOTFOUND: Host not found. Check DB_HOST in .env.");
    }
  }
})();
