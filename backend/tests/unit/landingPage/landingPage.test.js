const request = require('supertest');
const express = require('express');

jest.mock('../../../config/database', () => {
  const mockQuery = jest.fn();
  return {
    promise: () => ({ query: mockQuery }),
    connect: jest.fn(),
  };
});

const landingPageRoutes = require('../../../routes/landingPage');
const db = require('../../../config/database');

const app = express();
app.use('/api', landingPageRoutes);

describe('LandingPage API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/pools should return pools array', async () => {
    const mockPools = [
      { id: 1, name: 'Pool A', education_sessions: 5, free_swimming_sessions: 10 },
    ];
    db.promise().query.mockResolvedValueOnce([mockPools]);

    const res = await request(app).get('/api/pools');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockPools);
  });

  it('GET /api/pools should return 500 on DB error', async () => {
    db.promise().query.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app).get('/api/pools');

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});
