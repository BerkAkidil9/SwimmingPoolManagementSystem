const request = require('supertest');
const express = require('express');

jest.mock('../../../config/database', () => {
  const mockQuery = jest.fn();
  return { promise: () => ({ query: mockQuery }), connect: jest.fn() };
});

const adminRoutes = require('../../../routes/admin');
const db = require('../../../config/database');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin Pools API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/admin/pools requires admin auth or returns error when unauthenticated', async () => {
    const res = await request(app).get('/api/admin/pools');
    expect([401, 403, 500]).toContain(res.status);
  });
});
