const express = require('express');
const router = express.Router();
const passport = require('passport');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const pool = require('../db');

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

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USERNAME || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
});

// Request password reset route
router.post('/reset-password-request', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check if user exists
        const [users] = await pool.promise().query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found with that email' });
        }
        
        const user = users[0];
        
        // Generate a reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Set token expiration (1 hour from now)
        const tokenExpires = new Date();
        tokenExpires.setHours(tokenExpires.getHours() + 1);
        
        // Save token and expiration to database
        await pool.promise().query(
            'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
            [resetToken, tokenExpires, user.id]
        );
        
        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
        
        // Send email with reset link
        const mailOptions = {
            from: process.env.EMAIL_USERNAME || 'your-email@gmail.com',
            to: email,
            subject: 'Your Password Reset Link',
            html: `
                <h1>Reset Your Password</h1>
                <p>Hello ${user.name || 'there'},</p>
                <p>You have requested to reset your password. Please click the link below to set a new password:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #0077cc; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
                <p>Thank you!</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        
        res.json({ message: 'Password reset link sent to your email' });
    } catch (error) {
        console.error('Error requesting password reset:', error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

// Verify password reset token route
router.get('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        // Find user with the token
        const [users] = await pool.promise().query(
            'SELECT * FROM users WHERE password_reset_token = ?',
            [token]
        );
        
        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }
        
        const user = users[0];
        
        // Check if token is expired
        const now = new Date();
        const tokenExpires = new Date(user.password_reset_expires);
        
        if (now > tokenExpires) {
            return res.status(400).json({ error: 'Password reset token has expired' });
        }
        
        // Token is valid
        res.json({ valid: true, email: user.email });
    } catch (error) {
        console.error('Error verifying reset token:', error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

// Reset password with token route
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        
        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        
        // Find user with the token
        const [users] = await pool.promise().query(
            'SELECT * FROM users WHERE password_reset_token = ?',
            [token]
        );
        
        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }
        
        const user = users[0];
        
        // Check if token is expired
        const now = new Date();
        const tokenExpires = new Date(user.password_reset_expires);
        
        if (now > tokenExpires) {
            return res.status(400).json({ error: 'Password reset token has expired' });
        }
        
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Update user's password and clear reset token
        await pool.promise().query(
            'UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );
        
        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

module.exports = router;