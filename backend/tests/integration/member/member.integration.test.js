/**
 * Member integration test - Uses SwimmingPoolManagementSystem_test DB.
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const express = require('express');
const session = require('express-session');

const loginRoutes = require('../../../routes/login');
const memberRoutes = require('../../../routes/member');
const db = require('../../../config/database');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
app.use('/auth', loginRoutes);
app.use('/api/member', memberRoutes);

describe('Member Integration', () => {
  const testEmail = `member-int-${Date.now()}@example.com`;
  const testPassword = 'MemberPass123!';
  let userId;

  beforeAll(async () => {
    const hash = await bcrypt.hash(testPassword, 10);
    const [rows] = await db.promise().query(
      'INSERT INTO users (email, password, name, surname, email_verified, verification_status, health_status) VALUES (?, ?, ?, ?, true, ?, ?) RETURNING id',
      [testEmail, hash, 'Member', 'Test', 'approved', 'approved']
    );
    userId = rows[0].id;
  });

  afterAll(async () => {
    await db.promise().query('DELETE FROM users WHERE id = ?', [userId]);
  });

  it('GET /user/me returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/member/user/me');
    expect(res.status).toBe(401);
  });

  it('GET /user/me returns user after login', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: testEmail, password: testPassword });

    const res = await agent.get('/api/member/user/me');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.email).toBe(testEmail);
  });

  it('GET /package-prices returns prices', async () => {
    const res = await request(app).get('/api/member/package-prices');

    expect(res.status).toBe(200);
    expect(res.body.prices).toBeDefined();
    expect(res.body.prices.education).toBeDefined();
    expect(res.body.prices.free_swimming).toBeDefined();
  });

  it('GET /package requires auth', async () => {
    const res = await request(app).get('/api/member/package');

    expect(res.status).toBe(401);
  });

  it('GET /package returns package after login', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: testEmail, password: testPassword });

    const res = await agent.get('/api/member/package');

    expect(res.status).toBe(200);
    expect(res.body === null || typeof res.body === 'object').toBe(true);
  });
});
