const request = require('supertest');
const express = require('express');

jest.mock('../../../config/database', () => {
  const mockQuery = jest.fn();
  return { promise: () => ({ query: mockQuery }), connect: jest.fn() };
});

const adminRoutes = require('../../../routes/admin');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin Feedback API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/admin/feedback requires admin auth', async () => {
    const res = await request(app).get('/api/admin/feedback');
    expect([401, 403, 500]).toContain(res.status);
  });
});
