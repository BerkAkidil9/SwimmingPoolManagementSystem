const express = require('express');
const router = express.Router();
const passport = require('passport');
const pool = require('../config/database');

// Password reset is handled only in register.js under /auth with rate limiting.
// Do not re-add reset routes here to avoid exposing rate-limit-free endpoints.

// Google authentication route
router.get('/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: '/login',
        failureMessage: true
    }),
    async (req, res) => {
        try {
            // Check if email already exists
            const [existingUser] = await pool.query(
                'SELECT * FROM users WHERE email = ?',
                [req.user.emails[0].value]
            );

            if (existingUser.length > 0) {
                // Email exists, redirect with error
                return res.redirect('/register/social?error=EMAIL_IN_USE');
            }

            // Email doesn't exist, proceed with registration
            res.redirect('/register/social');
        } catch (error) {
            console.error('Error in Google callback:', error);
            res.redirect('/login?error=server_error');
        }
    }
);

module.exports = router;