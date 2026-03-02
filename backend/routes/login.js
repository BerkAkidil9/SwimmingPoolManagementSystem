const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const db = require("../config/database");
const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Try again later." },
});

router.post("/login", loginLimiter, async (req, res) => {
  console.log("[LOGIN] POST /auth/login received");

  const { email, password } = req.body;

  try {
    const [users] = await db
      .promise()
      .query(
        `SELECT id, name, email, password, role, verification_status,
                email_verified, health_status, rejection_count
         FROM users WHERE email = ?`,
        [email]
      );
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // OAuth accounts have no password - they must log in with Google
    if (!user.password) {
      return res.status(403).json({ error: "This account was created with Google. Please log in with \"Continue with Google\"." });
    }

    // Verify the password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Email verification required (including social accounts)
    if (!user.email_verified) {
      return res
        .status(403)
        .json({ error: "Please verify your email before logging in." });
    }
    
    // Check if verification is pending
    if (user.verification_status === 'pending') {
      return res
        .status(403)
        .json({ error: "Your account is pending verification. Please wait for admin approval." });
    }
    
    // Block login if rejected 3 times - account permanently banned from verification
    if (user.verification_status === 'rejected' && (user.rejection_count || 0) >= 3) {
      return res
        .status(403)
        .json({ error: "Your account has reached the maximum number of verification attempts. Access is no longer available. Please contact support or create a new account." });
    }
    
    // Block login if health assessment was rejected by doctor
    if (user.health_status === 'rejected') {
      return res
        .status(403)
        .json({ error: "Your health assessment has been rejected. You are unable to participate in swimming activities. Access is no longer available." });
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log("LOGIN BACKEND - User found:", {
        id: user.id,
        role: user.role,
        verification: user.verification_status
      });
    }
    
    req.session.user = { 
      id: user.id, 
      email: user.email,
      role: user.role || 'user',
      name: user.name,
      verificationStatus: user.verification_status
    };

    res.json({ 
      isAuthenticated: true, 
      user: { 
        id: user.id, 
        name: user.name,
        role: user.role || 'user',
        verificationStatus: user.verification_status
      }
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Invalid email or password." });
  }
});

module.exports = router;