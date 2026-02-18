#!/usr/bin/env node
/**
 * PostgreSQL bağlantı tanılama - lokal neden çalışmıyor kontrol et
 * npm run db:check
 */
require("dotenv").config({ path: ".env.test" });
require("dotenv").config();

const host = process.env.TEST_DB_HOST || process.env.DB_HOST || "localhost";
const port = process.env.TEST_DB_PORT || process.env.DB_PORT || "5432";
const user = process.env.TEST_DB_USER || process.env.DB_USER || "postgres";
const dbName = process.env.TEST_DB_NAME || "swimcenter_test";

console.log("--- PostgreSQL Bağlantı Kontrolü ---\n");
console.log("Kullanılan ayarlar:");
console.log("  DB_HOST:", host);
console.log("  DB_PORT:", port);
console.log("  DB_USER:", user);
console.log("  DB_NAME:", dbName);
console.log("  TEST_DATABASE_URL:", process.env.TEST_DATABASE_URL ? "(ayarlı)" : "(yok)");
console.log("  .env.test yüklü mü:", !!process.env.TEST_DB_HOST || !!process.env.TEST_DB_PORT);
console.log("  .env DB_HOST:", process.env.DB_HOST || "(varsayılan localhost)");
console.log("");

const possibleCauses = [
  "1. PostgreSQL servisi kapalı olabilir",
  "2. Port 5432'de başka program dinliyor olabilir (çakışma)",
  "3. .env içinde DB_HOST=xxx.neon.tech varsa local değil cloud'a bağlanıyor",
  "4. PostgreSQL farklı porta kurulmuş olabilir (5433, 5434)",
  "5. Windows'ta postgresql-x64-XX servisi 'Running' değil"
];

console.log("Olası sebepler:");
possibleCauses.forEach((c) => console.log("  ", c));
console.log("");

const { Pool } = require("pg");
const connStr = process.env.TEST_DATABASE_URL || `postgresql://${user}:${process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || "postgres"}@${host}:${port}/${dbName}`;

(async () => {
  try {
    const pool = new Pool({ connectionString: connStr, connectionTimeoutMillis: 3000 });
    await pool.query("SELECT 1");
    console.log("✓ Bağlantı başarılı!");
    await pool.end();
  } catch (e) {
    console.log("Hata:", e.code || "?", e.message);
    if (e.code === "ECONNREFUSED") {
      console.log("\n→ ECONNREFUSED: localhost:" + port + " adresinde dinleyen yok.");
      console.log("  PostgreSQL servisini başlat: Services -> postgresql-x64-XX -> Start");
      console.log("  Veya: pg_ctl -D \"C:\\Program Files\\PostgreSQL\\16\\data\" start");
    }
    if (e.code === "ENOTFOUND") {
      console.log("\n→ ENOTFOUND: Host bulunamadı. .env'de DB_HOST yanlış olabilir.");
    }
  }
})();
