/**
 * LandingPage integration test - uses real BitirmeProjesi_test database.
 */
const request = require('supertest');
const express = require('express');

const landingPageRoutes = require('../../../routes/landingPage');

const app = express();
app.use(express.json());
app.use('/api', landingPageRoutes);

describe('LandingPage Integration', () => {
  it('should fetch pools from database', async () => {
    const res = await request(app).get('/api/pools');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
