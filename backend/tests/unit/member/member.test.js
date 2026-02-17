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

const memberRoutes = require('../../../routes/member');
const db = require('../../../config/database');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
app.use('/api/member', memberRoutes);

describe('Member API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.promise().beginTransaction.mockResolvedValue();
    db.promise().commit.mockResolvedValue();
  });

  describe('GET /api/member/user/:userId', () => {
    it('returns 404 when user not found', async () => {
      db.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/member/user/999');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('returns user data when found', async () => {
      db.promise().query.mockResolvedValueOnce([[
        { id: 1, name: 'Test', surname: 'User', email: 'test@test.com' },
      ]]);

      const res = await request(app).get('/api/member/user/1');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test');
    });
  });

  describe('GET /api/member/package', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).get('/api/member/package');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/member/reservations', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).get('/api/member/reservations');
      expect(res.status).toBe(401);
    });
  });
});
