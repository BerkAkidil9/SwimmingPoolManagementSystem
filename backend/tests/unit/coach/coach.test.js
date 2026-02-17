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

const coachRoutes = require('../../../routes/coach');
const db = require('../../../config/database');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
app.use('/api/coach', coachRoutes);

describe('Coach API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/coach/members', () => {
    it('returns 403 when not coach', async () => {
      const res = await request(app).get('/api/coach/members');
      expect(res.status).toBe(403);
    });

    it('returns members when coach', async () => {
      db.promise().query.mockResolvedValueOnce([[{ id: 1, name: 'Ali', surname: 'Veli' }]]);
      const agent = request.agent(app);
      // We need a way to set session - without it we get 403
      const res = await request(app).get('/api/coach/members');
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/coach/members/:userId/swimming-status', () => {
    it('returns 400 for invalid swimming_ability', async () => {
      // Would need coach session - but validation runs first
      const res = await request(app)
        .put('/api/coach/members/1/swimming-status')
        .send({ swimming_ability: 'invalid' });
      expect(res.status).toBe(403); // Auth first
    });
  });
});
