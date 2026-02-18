// Integration test setup - use test database (never hit production)
// 1) TEST_DATABASE_URL -> use it
// 2) TEST_DB_* or defaults (localhost:5432)
require("dotenv").config({ path: ".env.test" }); // load .env.test if exists
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else {
  delete process.env.DATABASE_URL;
  process.env.DB_NAME = process.env.TEST_DB_NAME || "swimcenter_test";
  process.env.DB_HOST = process.env.TEST_DB_HOST || "localhost";
  process.env.DB_PORT = process.env.TEST_DB_PORT || "5432";
  process.env.DB_USER = process.env.TEST_DB_USER || "postgres";
  process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || "postgres";
}
