// Authentication middleware

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "You must be logged in to access this resource" });
  }
  next();
};

// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: "You must be an admin to access this resource" });
  }
  next();
};

// Middleware to check if user is a doctor
const isDoctor = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'doctor') {
    return res.status(403).json({ error: "You must be a doctor to access this resource" });
  }
  next();
};

// Middleware to check if user is a coach
const isCoach = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'coach') {
    return res.status(403).json({ error: "You must be a coach to access this resource" });
  }
  next();
};

// Middleware to check if user is a regular user
const isUser = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'user') {
    return res.status(403).json({ error: "You must be a regular user to access this resource" });
  }
  next();
};

module.exports = {
  isLoggedIn,
  isAdmin,
  isDoctor,
  isCoach,   
  isUser
};
