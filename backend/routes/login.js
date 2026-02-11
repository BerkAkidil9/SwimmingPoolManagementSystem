const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/database");
const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const [users] = await db
      .promise()
      .query("SELECT * FROM users WHERE email = ?", [email]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // OAuth hesaplarının şifresi yok - bunlar Google/GitHub ile giriş yapmalı
    if (!user.password) {
      return res.status(403).json({ error: "Bu hesap Google/GitHub ile oluşturulmuş. Lütfen \"Continue with Google\" veya \"Continue with GitHub\" ile giriş yapın." });
    }

    // Verify the password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Check if email is verified
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
    
    // Debug logs for doctor role issue
    console.log("LOGIN BACKEND - User found:", {
      id: user.id,
      email: user.email, 
      role: user.role,
      roleType: typeof user.role,
      verification: user.verification_status
    });
    
    // Create session - allow rejected users to log in, but mark their status
    req.session.user = { 
      id: user.id, 
      email: user.email,
      role: user.role || 'user',
      name: user.name,
      verificationStatus: user.verification_status
    };

    console.log("LOGIN BACKEND - Session created:", req.session.user);

    // Send response based on role and verification status
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
    console.error("LOGIN ERROR - Message:", err.message);
    console.error("LOGIN ERROR - Stack:", err.stack);
    res.status(500).json({ error: err.message || "Server error. Please try again." });
  }
});

module.exports = router;