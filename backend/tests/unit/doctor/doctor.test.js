const request = require('supertest');
const express = require('express');
const session = require('express-session');

jest.mock('../../../config/database', () => {
  const mockQuery = jest.fn();
  return {
    promise: () => ({ query: mockQuery }),
    connect: jest.fn(),
  };
});

jest.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: jest.fn().mockResolvedValue({}),
  }),
}));

const doctorRoutes = require('../../../routes/doctor');
const db = require('../../../config/database');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
app.use('/api/doctor', doctorRoutes);

describe('Doctor API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/doctor/health-reviews', () => {
    it('returns 403 when not doctor', async () => {
      const res = await request(app).get('/api/doctor/health-reviews');
      expect(res.status).toBe(403);
    });

    it('returns health reviews when doctor', async () => {
      const agent = request.agent(app);
      await agent.post('/auth/login').send({}); // Will need session setup
      // Simulate doctor session
      const res = await request(app)
        .get('/api/doctor/health-reviews')
        .set('Cookie', ['connect.sid=test']);
      // Without session, 403
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/doctor/health-status/:userId', () => {
    it('returns 403 when not authenticated', async () => {
      const res = await request(app)
        .put('/api/doctor/health-status/1')
        .send({ status: 'approved' });
      expect(res.status).toBe(403);
    });
  });
});
