/**
 * Register integration test - uses swimcenter_test DB.
 */
const request = require('supertest');
const express = require('express');
const session = require('express-session');

const registerRoutes = require('../../../register');
const db = require('../../../config/database');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
app.use('/auth', registerRoutes);

describe('Register Integration', () => {
  const uniqueEmail = `reg-test-${Date.now()}@example.com`;
  const existingEmail = `reg-existing-${Date.now()}@example.com`;
  const uniquePhone = `0532${String(Date.now()).slice(-7)}`;

  beforeAll(async () => {
    await db.promise().query(
      'INSERT INTO users (email, name, surname, email_verified, verification_status, health_status) VALUES (?, ?, ?, true, ?, ?)',
      [existingEmail, 'Existing', 'User', 'approved', 'approved']
    );
  });

  afterAll(async () => {
    await db.promise().query('DELETE FROM users WHERE email IN (?, ?)', [uniqueEmail, existingEmail]);
  });

  it('check-email returns isUnique true for new email', async () => {
    const res = await request(app)
      .post('/auth/check-email')
      .send({ email: uniqueEmail });

    expect(res.status).toBe(200);
    expect(res.body.isUnique).toBe(true);
  });

  it('check-email returns isUnique false for existing email', async () => {
    const res = await request(app)
      .post('/auth/check-email')
      .send({ email: existingEmail });

    expect(res.status).toBe(200);
    expect(res.body.isUnique).toBe(false);
  });

  it('check-phone returns isUnique true for new phone', async () => {
    const res = await request(app)
      .post('/auth/check-phone')
      .send({ phone: uniquePhone });

    expect(res.status).toBe(200);
    expect(res.body.isUnique).toBe(true);
  });
});
