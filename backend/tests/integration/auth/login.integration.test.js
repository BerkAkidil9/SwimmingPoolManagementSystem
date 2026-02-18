/**
 * Login integration test - uses real SwimmingPoolManagementSystem_test database.
 * Run: npm run db:test:setup  (then) npm run test:integration
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const express = require('express');
const session = require('express-session');

const loginRoutes = require('../../../routes/login');
const db = require('../../../config/database');

const app = express();
app.use(express.json());
app.use(
  session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use('/auth', loginRoutes);

describe('Login Integration', () => {
  const testEmail = 'integration-test@example.com';
  const testPassword = 'TestPass123!';
  let userId;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const [rows] = await db.promise().query(
      'INSERT INTO users (email, password, name, surname, email_verified, verification_status, health_status) VALUES (?, ?, ?, ?, true, ?, ?) RETURNING id',
      [testEmail, hashedPassword, 'Integration', 'Test', 'approved', 'approved']
    );
    userId = rows[0].id;
  });

  afterAll(async () => {
    await db.promise().query('DELETE FROM users WHERE id = ?', [userId]);
  });

  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.isAuthenticated).toBe(true);
    expect(res.body.user.email).toBeUndefined();
    expect(res.body.user.name).toBe('Integration');
    expect(res.body.user.role).toBe('user');
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid email or password');
  });

  it('should return 401 for non-existent user', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'any' });

    expect(res.status).toBe(401);
  });
});
