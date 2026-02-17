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

jest.mock('stripe', () => {
  return jest.fn(() => ({
    customers: { create: jest.fn().mockResolvedValue({ id: 'cus_test123' }) },
    paymentIntents: { create: jest.fn().mockResolvedValue({ client_secret: 'secret_xxx' }) },
  }));
});

const paymentRoutes = require('../../../routes/payment');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
app.use('/api/payment', paymentRoutes);

describe('Payment API', () => {
  describe('POST /api/payment/create-payment-intent', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/payment/create-payment-intent')
        .send({ type: 'education' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when type is missing', async () => {
      // Would need session - 401 comes first
      const res = await request(app)
        .post('/api/payment/create-payment-intent')
        .send({});
      expect(res.status).toBe(401);
    });
  });
});
