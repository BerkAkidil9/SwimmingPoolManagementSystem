/**
 * Admin integration test - Uses SwimmingPoolManagementSystem_test DB.
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const express = require('express');
const session = require('express-session');

const loginRoutes = require('../../../routes/login');
const adminRoutes = require('../../../routes/admin');
const db = require('../../../config/database');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
app.use('/auth', loginRoutes);
app.use('/api/admin', adminRoutes);

describe('Admin Integration', () => {
  const adminEmail = `admin-int-${Date.now()}@example.com`;
  const adminPassword = 'AdminPass123!';
  let adminId;
  let poolId;

  beforeAll(async () => {
    const hash = await bcrypt.hash(adminPassword, 10);
    const [rows] = await db.promise().query(
      "INSERT INTO users (email, password, name, surname, email_verified, verification_status, health_status, role) VALUES (?, ?, ?, ?, true, ?, ?, 'admin') RETURNING id",
      [adminEmail, hash, 'Admin', 'Test', 'approved', 'approved']
    );
    adminId = rows[0].id;
  });

  afterAll(async () => {
    if (poolId) await db.promise().query('DELETE FROM "Pools" WHERE id = ?', [poolId]);
    await db.promise().query('DELETE FROM users WHERE id = ?', [adminId]);
  });

  it('GET /verifications requires admin auth', async () => {
    const res = await request(app).get('/api/admin/verifications');
    expect(res.status).toBe(403);
  });

  it('GET /verifications returns list when admin', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: adminEmail, password: adminPassword });

    const res = await agent.get('/api/admin/verifications');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /pools returns pools when admin', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: adminEmail, password: adminPassword });

    const res = await agent.get('/api/admin/pools');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /pools creates pool when admin', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: adminEmail, password: adminPassword });

    const res = await agent.post('/api/admin/pools').send({
      name: 'Test Pool Integration',
      capacity: 50,
      rules: 'Test rules',
      location: '41.0082, 28.9784',
    });

    expect(res.status).toBe(200);
    expect(res.body.poolId).toBeDefined();
    poolId = res.body.poolId;
  });

  it('GET /feedback returns feedback when admin', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: adminEmail, password: adminPassword });

    const res = await agent.get('/api/admin/feedback');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
