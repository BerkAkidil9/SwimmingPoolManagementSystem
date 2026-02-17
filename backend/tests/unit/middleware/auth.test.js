const { isAdmin, isDoctor } = require('../../../middleware/auth');

describe('Auth Middleware', () => {
  const createMockReq = (sessionUser = null) => ({
    session: { user: sessionUser },
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  });

  const createMockRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  });

  const createMockNext = () => jest.fn();

  describe('isAdmin', () => {
    it('calls next when user is admin', () => {
      const req = createMockReq({ role: 'admin' });
      const res = createMockRes();
      const next = createMockNext();
      isAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when user is not admin', () => {
      const req = createMockReq({ role: 'member' });
      const res = createMockRes();
      const next = createMockNext();
      isAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when no session user', () => {
      const req = createMockReq(null);
      const res = createMockRes();
      const next = createMockNext();
      isAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('isDoctor', () => {
    it('calls next when user is doctor', () => {
      const req = createMockReq({ role: 'doctor' });
      const res = createMockRes();
      const next = createMockNext();
      isDoctor(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('returns 403 when user is not doctor', () => {
      const req = createMockReq({ role: 'member' });
      const res = createMockRes();
      const next = createMockNext();
      isDoctor(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Doctor access required' });
    });
  });
});
