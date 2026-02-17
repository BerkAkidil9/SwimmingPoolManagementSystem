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

jest.mock('bcryptjs', () => ({
  hash: jest.fn((str) => Promise.resolve('hashed_' + str)),
}));
jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: jest.fn().mockResolvedValue({}) }),
}));

// Mock passport strategies before register loads them
jest.mock('passport-google-oauth20', () => ({
  Strategy: jest.fn().mockImplementation(() => ({ name: 'google' })),
}));
jest.mock('passport-github2', () => ({
  Strategy: jest.fn().mockImplementation(() => ({ name: 'github' })),
}));
jest.mock('passport-facebook', () => ({
  Strategy: jest.fn().mockImplementation(() => ({ name: 'facebook' })),
}));

const registerRoutes = require('../../../register');
const db = require('../../../config/database');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
app.use('/auth', registerRoutes);

describe('Register API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /auth/check-email', () => {
    it('returns isUnique when email not in DB', async () => {
      db.promise().query.mockResolvedValueOnce([[{ count: 0 }]]);
      const res = await request(app)
        .post('/auth/check-email')
        .send({ email: 'new@test.com' });
      expect(res.status).toBe(200);
      expect(res.body.isUnique).toBe(true);
    });

    it('returns isUnique false when email exists', async () => {
      db.promise().query.mockResolvedValueOnce([[{ count: 1 }]]);
      const res = await request(app)
        .post('/auth/check-email')
        .send({ email: 'existing@test.com' });
      expect(res.status).toBe(200);
      expect(res.body.isUnique).toBe(false);
    });
  });

  describe('POST /auth/check-phone', () => {
    it('returns isUnique when phone not in DB', async () => {
      db.promise().query.mockResolvedValueOnce([[{ count: 0 }]]);
      const res = await request(app)
        .post('/auth/check-phone')
        .send({ phone: '05321112233' });
      expect(res.status).toBe(200);
      expect(res.body.isUnique).toBe(true);
    });
  });
});
