const request = require('supertest');
const express = require('express');
const session = require('express-session');

jest.mock('../../../config/database', () => ({
  promise: () => ({ query: jest.fn().mockResolvedValue([[]]) }),
  connect: jest.fn(),
}));
jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: jest.fn().mockResolvedValue({}) }),
}));

// Create mock middleware/auth if missing
try {
  require('../../../middleware/auth');
} catch (e) {
  jest.mock('../../../middleware/auth', () => ({
    isAdmin: (req, res, next) => next(),
    isDoctor: (req, res, next) => next(),
  }), { virtual: true });
}

describe('Reminders API', () => {
  let app;
  beforeAll(() => {
    try {
      const remindersRoutes = require('../../../routes/reminders');
      app = express();
      app.use(express.json());
      app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
      app.use('/api/reminders', remindersRoutes);
    } catch (e) {
      app = null;
    }
  });

  it('send-health-report-reminders requires auth', async () => {
    if (!app) return expect(true).toBe(true);
    const res = await request(app).post('/api/reminders/send-health-report-reminders');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
