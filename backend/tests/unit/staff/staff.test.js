const request = require('supertest');
const express = require('express');
const session = require('express-session');

jest.mock('../../../config/database', () => {
  const mockQuery = jest.fn();
  const mockBeginTransaction = jest.fn();
  const mockCommit = jest.fn();
  const mockRollback = jest.fn();
  return {
    promise: () => ({
      query: mockQuery,
      beginTransaction: mockBeginTransaction,
      commit: mockCommit,
      rollback: mockRollback,
    }),
    connect: jest.fn(),
  };
});

const staffRoutes = require('../../../routes/staff');
const db = require('../../../config/database');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
app.use('/api/staff', staffRoutes);

describe('Staff API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.promise().rollback.mockResolvedValue();
  });

  describe('GET /api/staff/dashboard', () => {
    it('returns 403 when not staff', async () => {
      const res = await request(app).get('/api/staff/dashboard');
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Staff|Access denied/);
    });
  });

  describe('POST /api/staff/verify-qr-code', () => {
    it('returns 403 when not staff', async () => {
      const res = await request(app)
        .post('/api/staff/verify-qr-code')
        .send({ qrData: '{}' });
      expect(res.status).toBe(403);
    });
  });
});
