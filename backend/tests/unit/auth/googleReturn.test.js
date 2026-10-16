const request = require('supertest');
const express = require('express');
const session = require('express-session');

let mockGoogleUser;
jest.mock('../../../config/database', () => ({ promise: () => ({ query: jest.fn() }) }));
jest.mock('passport-google-oauth20', () => ({ Strategy: jest.fn() }));
jest.mock('passport', () => ({
  use: jest.fn(), serializeUser: jest.fn(), deserializeUser: jest.fn(),
  authenticate: jest.fn((strategy, options) => {
    if (options.scope) return (req, res) => res.redirect('/mock-google-consent');
    return (req, res, next) => {
      // Model Passport's session regeneration on successful authentication.
      req.session.regenerate(error => {
        if (error) return next(error);
        req.user = { ...mockGoogleUser };
        next();
      });
    };
  }),
}));

const registerRoutes = require('../../../routes/register');
const app = express();
app.use(session({ secret: 'synthetic-google-session', resave: false, saveUninitialized: false }));
app.use('/auth', registerRoutes);
app.get('/session-user', (req, res) => res.json(req.session.user || null));

describe('Google login return to health report', () => {
  const frontendOrigin = 'https://frontend.example';
  const originalFrontend = process.env.FRONTEND_URL;

  beforeEach(() => {
    process.env.FRONTEND_URL = frontendOrigin;
    mockGoogleUser = {
      id: 42, email: 'member@example.com', name: 'Member', role: 'user',
      email_verified: true, verification_status: 'approved', health_status: 'needs_report',
      isTemp: false,
    };
  });

  afterAll(() => {
    if (originalFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontend;
  });

  async function googleLogin(returnTo) {
    const agent = request.agent(app);
    const start = agent.get('/auth/google');
    if (returnTo !== undefined) start.query({ returnTo });
    expect((await start).headers.location).toBe('/mock-google-consent');
    return { agent, callback: await agent.get('/auth/google/callback') };
  }

  it.each(['/upload-health-report/42', '/health-report-upload?userId=42'])(
    'retains %s across session regeneration and consumes it after login', async target => {
      const { agent, callback } = await googleLogin(target);
      expect(callback.headers.location).toBe(frontendOrigin + target);
      expect((await agent.get('/session-user')).body.id).toBe(42);
      // The destination cannot affect the next, unrelated login.
      expect((await agent.get('/auth/google/callback')).headers.location).toBe(frontendOrigin + '/member/dashboard');
    },
  );

  it('rejects external, malformed and unrelated redirect targets', async () => {
    for (const target of [
      'https://example.com', '//example.com', '/\\example.com', '/admin',
      '/upload-health-report/42\n', '/upload-health-report/42?next=https://example.com',
      '/upload-health-report/%2f%2fexample.com',
    ]) {
      expect((await googleLogin(target)).callback.headers.location).toBe(frontendOrigin + '/member/dashboard');
    }
  });

  it('keeps normal member and admin destinations without a report link', async () => {
    expect((await googleLogin()).callback.headers.location).toBe(frontendOrigin + '/member/dashboard');
    mockGoogleUser.role = 'admin';
    expect((await googleLogin()).callback.headers.location).toBe(frontendOrigin + '/admin');
  });

  it('does not bypass the registration flow for a new Google account', async () => {
    mockGoogleUser.isTemp = true;
    expect((await googleLogin('/upload-health-report/42')).callback.headers.location).toBe(frontendOrigin + '/register/social');
  });

  it('does not bypass account restrictions when a report destination is supplied', async () => {
    for (const [changes, error] of [
      [{ email_verified: false }, 'verify_email'],
      [{ health_status: 'rejected' }, 'health_rejected'],
      [{ verification_status: 'rejected', rejection_count: 3 }, 'verification_banned'],
    ]) {
      const original = { ...mockGoogleUser };
      Object.assign(mockGoogleUser, changes);
      const { callback } = await googleLogin('/upload-health-report/42');
      expect(callback.headers.location).toBe(frontendOrigin + '/login?error=' + error);
      mockGoogleUser = original;
    }
  });
});
