/**
 * Reset user4 to UNVERIFIED state and generate test verification link
 * Run: node scripts/reset-user4-for-email-test.js
 */
require('dotenv').config();
const crypto = require('crypto');
const db = require('../config/database');

const EMAIL = 'cs401projesi+user4@gmail.com';
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function reset() {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [result] = await db.promise().query(
      `UPDATE users SET 
        email_verified = 0, 
        verification_status = 'pending',
        verification_token = ?,
        verification_token_expires = ?
      WHERE email = ?`,
      [token, expires, EMAIL]
    );

    if (result.affectedRows === 0) {
      console.log('User not found. Run create-user4.js first.');
      process.exit(1);
    }

    const verificationLink = `${BACKEND_URL}/auth/verify-email?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(FRONTEND_URL)}`;

    console.log('\n--- User4 reset for email verification test ---');
    console.log('Email:', EMAIL);
    console.log('Status: UNVERIFIED (email_verified=0)');
    console.log('\nTest verification link (copy & paste in browser):');
    console.log(verificationLink);
    console.log('\nAfter clicking, login at', FRONTEND_URL + '/login');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

reset();
