/**
 * Staff integration test - BitirmeProjesi_test DB kullanır.
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const express = require('express');
const session = require('express-session');

const loginRoutes = require('../../../routes/login');
const staffRoutes = require('../../../routes/staff');
const db = require('../../../config/database');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
app.use('/auth', loginRoutes);
app.use('/api/staff', staffRoutes);

describe('Staff Integration', () => {
  const staffEmail = `staff-int-${Date.now()}@example.com`;
  const staffPassword = 'StaffPass123!';
  let staffId;

  beforeAll(async () => {
    const hash = await bcrypt.hash(staffPassword, 10);
    const [r] = await db.promise().query(
      "INSERT INTO users (email, password, name, surname, email_verified, verification_status, health_status, role) VALUES (?, ?, ?, ?, 1, ?, ?, 'staff')",
      [staffEmail, hash, 'Staff', 'Test', 'approved', 'approved']
    );
    staffId = r.insertId;
  });

  afterAll(async () => {
    await db.promise().query('DELETE FROM users WHERE id = ?', [staffId]);
  });

  it('GET /dashboard requires staff auth', async () => {
    const res = await request(app).get('/api/staff/dashboard');
    expect(res.status).toBe(403);
  });

  it('GET /dashboard returns staff info when staff', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: staffEmail, password: staffPassword });

    const res = await agent.get('/api/staff/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.staffInfo).toBeDefined();
    expect(res.body.staffInfo.email).toBe(staffEmail);
  });

  it('POST /verify-qr-code rejects invalid data', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: staffEmail, password: staffPassword });

    const res = await agent.post('/api/staff/verify-qr-code').send({ qrData: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('POST /verify-qr-code requires qrData', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: staffEmail, password: staffPassword });

    const res = await agent.post('/api/staff/verify-qr-code').send({});

    expect(res.status).toBe(400);
  });
});
