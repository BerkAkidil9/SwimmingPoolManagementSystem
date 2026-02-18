require("dotenv").config();
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || (
  process.env.DB_HOST
    ? `postgresql://${process.env.DB_USER || "postgres"}:${process.env.DB_PASSWORD || ""}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || "swimcenter"}`
    : "postgresql://postgres:postgres@localhost:5432/swimcenter"
);

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" && process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Convert ? placeholders to PostgreSQL $1, $2, ...
function toPgParams(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Wrapper: query returns [rows]
async function query(sql, params = []) {
  const pgSql = toPgParams(sql);
  const result = await pool.query(pgSql, params);
  return [result.rows];
}

// Transaction helper - runs callback with a client that has compatible .query
async function transaction(callback) {
  const client = await pool.connect();
  const trx = {
    query: async (sql, params) => {
      const pgSql = toPgParams(sql);
      const result = await client.query(pgSql, params);
      return [result.rows];
    },
  };
  try {
    await client.query("BEGIN");
    const result = await callback(trx);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// DB API
const db = {
  query,
  connect: (cb) => {
    pool.query("SELECT 1")
      .then(() => cb && cb(null))
      .catch((err) => cb && cb(err));
  },
  end: (cb) => {
    pool.end().then(() => cb && cb(null)).catch((err) => cb && cb(err));
  },
  promise: () => ({
    query,
    beginTransaction: async () => { throw new Error("Use db.transaction() for PostgreSQL"); },
    commit: async () => { throw new Error("Use db.transaction() for PostgreSQL"); },
    rollback: async () => { throw new Error("Use db.transaction() for PostgreSQL"); },
  }),
  transaction,
  pool,
};

module.exports = db;
