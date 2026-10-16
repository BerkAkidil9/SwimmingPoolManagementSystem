const request = require('supertest');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');

jest.mock('../../../utils/sendEmail', () => ({ sendEmail: jest.fn().mockResolvedValue({ ok: true }) }));
jest.mock('../../../utils/r2Storage', () => ({ uploadToR2: jest.fn().mockResolvedValue(
  'https://storage.example/health_reports/synthetic-report.pdf',
) }));

const previousR2 = process.env.USE_R2;
process.env.USE_R2 = 'true';
const memberRoutes = require('../../../routes/member');
const doctorRoutes = require('../../../routes/doctor');
if (previousR2 === undefined) delete process.env.USE_R2;
else process.env.USE_R2 = previousR2;
const loginRoutes = require('../../../routes/login');
const db = require('../../../config/database');
const { sendEmail } = require('../../../utils/sendEmail');
const { uploadToR2 } = require('../../../utils/r2Storage');

const app = express();
app.use(express.json());
app.use(session({ secret: 'synthetic-report-session', resave: false, saveUninitialized: false }));
app.use('/auth', loginRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/doctor', doctorRoutes);

describe('Requested health report upload', () => {
  const suffix = `${Date.now()}-${process.pid}`;
  const password = 'SyntheticReport123!';
  const doctorEmail = `report-doctor-${suffix}@example.com`;
  const memberEmail = `report-member-${suffix}@example.com`;
  let doctorId, memberId, doctor, member;

  beforeAll(async () => {
    const hash = await bcrypt.hash(password, 10);
    for (const [email, role] of [[doctorEmail, 'doctor'], [memberEmail, 'user']]) {
      const [rows] = await db.promise().query(
        `INSERT INTO users (email, password, name, surname, role, email_verified,
          verification_status, health_status, health_status_reason)
         VALUES (?, ?, 'Report', 'Tester', ?, true, 'approved', 'approved', ?) RETURNING id`,
        [email, hash, role, 'Fictional demo health data; not a medical assessment.'],
      );
      if (role === 'doctor') doctorId = rows[0].id;
      else memberId = rows[0].id;
    }
    doctor = request.agent(app);
    member = request.agent(app);
    expect((await doctor.post('/auth/login').send({ email: doctorEmail, password })).status).toBe(200);
    expect((await member.post('/auth/login').send({ email: memberEmail, password })).status).toBe(200);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await db.promise().query('DELETE FROM health_reports WHERE user_id = ?', [memberId]);
    await db.promise().query(
      `UPDATE users SET health_status = 'pending', health_status_reason = NULL,
       health_report_request_count = 0, health_report_requested_at = NULL WHERE id = ?`,
      [memberId],
    );
  });

  afterAll(async () => {
    await db.promise().query('DELETE FROM health_reports WHERE user_id = ?', [memberId]);
    await db.promise().query('DELETE FROM users WHERE id IN (?, ?)', [doctorId, memberId]);
  });

  const upload = (agent, expectedUserId) => agent.post('/api/member/upload-health-report')
    .field('expectedUserId', String(expectedUserId))
    .attach('report', Buffer.from('synthetic health report'), {
      filename: 'report.pdf', contentType: 'application/pdf',
    });

  it('persists the doctor request, uploads for its recipient and waits for review', async () => {
    const response = await doctor.put(`/api/doctor/health-status/${memberId}`).send({
      status: 'needs_report', reason: 'Please provide an additional report.',
    });
    expect(response.status).toBe(200);
    expect(sendEmail.mock.calls[0][0].to).toBe(memberEmail);
    expect(sendEmail.mock.calls[0][0].html).toContain(`/upload-health-report/${memberId}`);

    const details = await member.get('/api/member/user/me');
    expect(details.body).toMatchObject({
      id: memberId, health_status: 'needs_report',
      health_status_reason: 'Please provide an additional report.',
    });
    expect((await upload(member, memberId)).status).toBe(200);
    const [reports] = await db.promise().query('SELECT user_id FROM health_reports WHERE user_id = ?', [memberId]);
    expect(reports).toEqual([{ user_id: memberId }]);
    expect((await member.get('/api/member/user/me')).body.health_status).toBe('pending');
    expect((await doctor.get(`/api/doctor/health-reports/${memberId}`)).body).toHaveLength(1);
    expect((await upload(member, memberId)).status).toBe(403);
    expect(uploadToR2).toHaveBeenCalledTimes(1);
  });

  it('rejects the doctor session instead of uploading for the member in the email link', async () => {
    await doctor.put(`/api/doctor/health-status/${memberId}`).send({
      status: 'needs_report', reason: 'Additional report required.',
    });
    const details = await doctor.get('/api/member/user/me');
    expect(details.body.id).toBe(doctorId);
    expect(details.body.health_status_reason).toContain('Fictional demo health data');

    const response = await upload(doctor, memberId);
    expect(response.status).toBe(409);
    expect(response.body.error).toContain('signed-in account changed');
    expect(uploadToR2).not.toHaveBeenCalled();
    expect((await member.get('/api/member/user/me')).body.health_status).toBe('needs_report');
  });

  it('keeps the active-request requirement for the authenticated member', async () => {
    const response = await upload(member, memberId);
    expect(response.status).toBe(403);
    expect(uploadToR2).not.toHaveBeenCalled();
    const [reports] = await db.promise().query('SELECT id FROM health_reports WHERE user_id = ?', [memberId]);
    expect(reports).toHaveLength(0);
  });
});
