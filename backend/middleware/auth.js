/**
 * Centralized auth middleware.
 * All route files MUST use these helpers instead of defining their own.
 */

function getCurrentUser(req) {
  return req.session?.user || (req.isAuthenticated?.() && req.user) || null;
}

function getCurrentUserId(req) {
  const user = getCurrentUser(req);
  return user?.id ?? null;
}

const isAuthenticated = (req, res, next) => {
  if (!getCurrentUser(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const isAdmin = (req, res, next) => {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const isDoctor = (req, res, next) => {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'doctor') {
    return res.status(403).json({ error: 'Doctor access required' });
  }
  next();
};

const isCoach = (req, res, next) => {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'coach') {
    return res.status(403).json({ error: 'Coach access required' });
  }
  next();
};

const isStaff = (req, res, next) => {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'staff') {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
};

module.exports = { getCurrentUser, getCurrentUserId, isAuthenticated, isAdmin, isDoctor, isCoach, isStaff };
