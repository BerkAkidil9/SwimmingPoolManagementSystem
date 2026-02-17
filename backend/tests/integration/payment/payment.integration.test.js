/**
 * Payment integration test - SwimmingPoolManagementSystem_test DB kullanır.
 */
const request = require('supertest');
const express = require('express');
const session = require('express-session');

const paymentRoutes = require('../../../routes/payment');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
app.use('/api/payment', paymentRoutes);

describe('Payment Integration', () => {
  it('GET /config returns publishable key', async () => {
    const res = await request(app).get('/api/payment/config');

    expect(res.status).toBe(200);
    expect(res.body.publishableKey).toBeDefined();
    expect(res.body.publishableKey).toMatch(/^pk_/);
  });

  it('POST /create-payment-intent requires auth', async () => {
    const res = await request(app)
      .post('/api/payment/create-payment-intent')
      .send({ type: 'education' });

    expect(res.status).toBe(401);
  });

  it('GET /payment-methods requires auth', async () => {
    const res = await request(app).get('/api/payment/payment-methods');

    expect(res.status).toBe(401);
  });
});
