#!/usr/bin/env node
/**
 * Creates the test database (SwimmingPoolManagementSystem_test).
 * Uses DB_HOST, DB_USER, DB_PASSWORD from .env file.
 * Usage: node scripts/init-test-db.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

async function initTestDb() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true,
    });

    const schemaPath = path.join(__dirname, '../sql/schema_test.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await connection.query(sql);
    console.log('SwimmingPoolManagementSystem_test database created successfully.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

initTestDb();
