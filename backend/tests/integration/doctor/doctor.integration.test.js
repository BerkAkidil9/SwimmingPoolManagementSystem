/**
 * Doctor integration test - Uses SwimmingPoolManagementSystem_test DB.
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const express = require('express');
const session = require('express-session');

const loginRoutes = require('../../../routes/login');
const doctorRoutes = require('../../../routes/doctor');
const db = require('../../../config/database');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
app.use('/auth', loginRoutes);
app.use('/api/doctor', doctorRoutes);

describe('Doctor Integration', () => {
  const doctorEmail = `doctor-int-${Date.now()}@example.com`;
  const doctorPassword = 'DoctorPass123!';
  let doctorId;

  beforeAll(async () => {
    const hash = await bcrypt.hash(doctorPassword, 10);
    const [r] = await db.promise().query(
      "INSERT INTO users (email, password, name, surname, email_verified, verification_status, health_status, role) VALUES (?, ?, ?, ?, 1, ?, ?, 'doctor')",
      [doctorEmail, hash, 'Doctor', 'Test', 'approved', 'approved']
    );
    doctorId = r.insertId;
  });

  afterAll(async () => {
    await db.promise().query('DELETE FROM users WHERE id = ?', [doctorId]);
  });

  it('GET /health-reviews requires doctor auth', async () => {
    const res = await request(app).get('/api/doctor/health-reviews');
    expect(res.status).toBe(403);
  });

  it('GET /health-reviews returns list when doctor', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: doctorEmail, password: doctorPassword });

    const res = await agent.get('/api/doctor/health-reviews');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /pending-health-report-reminders returns list when doctor', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: doctorEmail, password: doctorPassword });

    const res = await agent.get('/api/doctor/pending-health-report-reminders');

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });
});
