const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../../../config/database', () => {
  const mockQuery = jest.fn();
  return {
    promise: () => ({ query: mockQuery }),
    connect: jest.fn(),
    __mockQuery: mockQuery,
  };
});

jest.mock('bcryptjs', () => ({
  ...jest.requireActual('bcryptjs'),
  compare: jest.fn(),
}));

// Need to create minimal app with login route
const express = require('express');
const session = require('express-session');
const loginRoutes = require('../../../routes/login');

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

const db = require('../../../config/database');

describe('Login API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 when user not found', async () => {
    db.promise().query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid email or password');
  });

  it('should return 403 when OAuth account tries password login', async () => {
    db.promise().query.mockResolvedValueOnce([[
      { id: 1, email: 'oauth@test.com', password: null, email_verified: true }
    ]]);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'oauth@test.com', password: 'anypassword' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Google|GitHub/);
  });

  it('should return 401 when password wrong', async () => {
    const hashedPass = '$2a$10$abcdefghijklmnopqrstuv'; // mock hash
    db.promise().query.mockResolvedValueOnce([[
      {
        id: 1,
        email: 'user@test.com',
        password: hashedPass,
        email_verified: true,
        verification_status: 'approved',
        role: 'user',
        name: 'Test',
        health_status: 'approved',
      },
    ]]);
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('should return 403 when email not verified', async () => {
    const hashedPass = '$2a$10$abcdefghijklmnopqrstuv';
    db.promise().query.mockResolvedValueOnce([[
      {
        id: 1,
        email: 'user@test.com',
        password: hashedPass,
        email_verified: false,
        verification_status: 'approved',
        role: 'user',
        name: 'Test',
        health_status: 'approved',
      },
    ]]);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/verify your email/);
  });

  it('should return 200 and user when credentials valid', async () => {
    const hashedPass = '$2a$10$abcdefghijklmnopqrstuv';
    db.promise().query.mockResolvedValueOnce([[
      {
        id: 1,
        email: 'user@test.com',
        password: hashedPass,
        email_verified: true,
        verification_status: 'approved',
        role: 'user',
        name: 'Test User',
        health_status: 'approved',
      },
    ]]);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.isAuthenticated).toBe(true);
    expect(res.body.user.role).toBe('user');
  });
});
