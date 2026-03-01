const isAuthenticated = (req, res, next) => {
  const user = req.session?.user || (req.isAuthenticated?.() && req.user) || null;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const isDoctor = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Doctor access required' });
  }
  next();
};

const isCoach = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'coach') {
    return res.status(403).json({ error: 'Coach access required' });
  }
  next();
};

const isStaff = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'staff') {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
};

module.exports = { isAuthenticated, isAdmin, isDoctor, isCoach, isStaff };
