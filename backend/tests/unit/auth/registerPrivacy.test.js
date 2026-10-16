const request = require('supertest');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');

jest.mock('../../../config/database', () => ({
  promise: () => ({ query: mockQuery }),
}));
jest.mock('../../../utils/sendEmail', () => ({ sendEmail: jest.fn() }));
jest.mock('../../../utils/r2Storage', () => ({ uploadToR2: jest.fn() }));
jest.mock('passport-google-oauth20', () => ({
  Strategy: jest.fn().mockImplementation(() => ({ name: 'google' })),
}));

const mockQuery = jest.fn();
const originalR2 = process.env.USE_R2;
process.env.USE_R2 = 'true';
const registerRoutes = require('../../../routes/register');
if (originalR2 === undefined) delete process.env.USE_R2;
else process.env.USE_R2 = originalR2;
const { sendEmail } = require('../../../utils/sendEmail');
const { uploadToR2 } = require('../../../utils/r2Storage');

const app = express();
app.use(session({ secret: 'synthetic-test-session', resave: false, saveUninitialized: false }));
app.use('/auth', registerRoutes);

const form = {
  name: 'Privacy', surname: 'Tester', email: 'private-person@example.com',
  password: 'PrivatePassword123!', confirmPassword: 'PrivatePassword123!',
  phone: '05321112233', date_of_birth: '1990-01-01', gender: 'Male', swimming_ability: 'Yes',
  height: '180', weight: '75', blood_type: 'A+', allergies: 'private-medical-information',
  emergency_contact_name: 'Emergency Person', emergency_contact_phone: '05324445566',
  emergency_contact_relationship: 'parent', terms_accepted: 'true', privacy_accepted: 'true',
  has_heart_problems: 'false', chest_pain_activity: 'false', balance_dizziness: 'false',
  other_chronic_disease: 'false', prescribed_medication: 'false', bone_joint_issues: 'false',
  doctor_supervised_activity: 'false',
};

describe('Registration log privacy', () => {
  let outputs;
  const originalMode = process.env.NODE_ENV;

  beforeEach(() => {
    outputs = ['log', 'info', 'warn', 'error'].map(method =>
      jest.spyOn(console, method).mockImplementation(() => {}));
    mockQuery.mockReset().mockResolvedValueOnce([[{ id: 42 }]]).mockResolvedValueOnce([[]]);
    sendEmail.mockReset().mockResolvedValue({ ok: true });
    uploadToR2.mockReset().mockResolvedValue('https://private-files.example/private-document');
  });

  afterEach(() => {
    if (originalMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalMode;
    jest.restoreAllMocks();
  });

  function register(overrides = {}) {
    const call = request(app).post('/auth/register');
    for (const [key, value] of Object.entries({ ...form, ...overrides })) call.field(key, value);
    return call
      .attach('idCard', Buffer.from('private-document-bytes'), {
        filename: 'private-identity.pdf', contentType: 'application/pdf',
      })
      .attach('profilePhoto', Buffer.from('private-photo-bytes'), {
        filename: 'private-photo.jpg', contentType: 'image/jpeg',
      });
  }

  function expectPrivateLogs() {
    const logged = JSON.stringify(outputs.flatMap(spy => spy.mock.calls));
    for (const value of [
      form.name, form.surname, form.email, form.password, form.phone, form.date_of_birth,
      form.allergies, form.emergency_contact_name, form.emergency_contact_phone,
      'private-', 'Buffer',
    ]) expect(logged).not.toContain(value);
  }

  it.each(['production', 'development'])('registers and hashes the password without leaking input in %s', async mode => {
    process.env.NODE_ENV = mode;
    const response = await register();

    expect(response.status).toBe(201);
    const storedHash = mockQuery.mock.calls[0][1][10];
    expect(storedHash).not.toBe(form.password);
    expect(await bcrypt.compare(form.password, storedHash)).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expectPrivateLogs();
    const logged = JSON.stringify(outputs.flatMap(spy => spy.mock.calls));
    expect(logged).not.toContain(storedHash);
    expect(logged).not.toContain(sendEmail.mock.calls[0][0].html);
  });

  it('still reports validation failures without logging the form or uploaded buffers', async () => {
    const response = await register({ height: '1' });

    expect(response.status).toBe(400);
    expect(response.body.errors.height).toBeDefined();
    expect(mockQuery).not.toHaveBeenCalled();
    expectPrivateLogs();
  });

  it('retains registration when email fails without exposing the provider error', async () => {
    sendEmail.mockRejectedValueOnce(Object.assign(new Error('private-refresh-token'), {
      response: { status: 400, data: { error: 'invalid_grant', payload: form } },
    }));
    const response = await register();

    expect(response.status).toBe(201);
    expect(outputs[3]).toHaveBeenCalledWith(
      '[REGISTER] Verification email failed; registration retained',
      { code: 'invalid_grant', status: 400 },
    );
    expectPrivateLogs();
  });

  it('returns the existing duplicate-email error without logging database details', async () => {
    mockQuery.mockReset().mockRejectedValueOnce(Object.assign(
      new Error('duplicate key users_email: private-person@example.com'),
      { code: '23505', detail: 'private-person@example.com', parameters: [form.password] },
    ));
    const response = await register();

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Email already registered');
    expect(outputs[3]).toHaveBeenCalledWith('[REGISTER] Registration failed', { code: '23505' });
    expectPrivateLogs();
  });
});
