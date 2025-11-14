import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaKey, FaEnvelope, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import './ResetPassword.css';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [isValidToken, setIsValidToken] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/auth/reset-password/${token}`);
        setIsValidToken(true);
        setEmail(response.data.email);
        setError('');
      } catch (err) {
        setIsValidToken(false);
        setError(err.response?.data?.error || 'Invalid or expired token. Please request a new password reset link.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      verifyToken();
    } else {
      setIsValidToken(false);
      setError('No reset token provided.');
      setLoading(false);
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post('/auth/reset-password', {
        token,
        password
      });
      
      setSuccess(true);
      setError('');
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-form loading">
          <div className="loading-spinner"></div>
          <p>Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-form success">
          <div className="success-icon">
            <FaCheckCircle />
          </div>
          <h1>Password Reset Successful!</h1>
          <p>Your password has been successfully changed.</p>
          <p>You will be redirected to the login page shortly...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-form">
        <h1>Reset Your Password</h1>
        
        {error && (
          <div className="error-message">
            <FaExclamationTriangle /> {error}
          </div>
        )}
        
        {!isValidToken ? (
          <div className="invalid-token">
            <p>This password reset link is invalid or has expired.</p>
            <p>Please request a new password reset link from the login page.</p>
            <button 
              className="return-button"
              onClick={() => navigate('/login')}
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>
                <FaEnvelope /> Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="disabled-input"
              />
              <small>This is the email associated with your account</small>
            </div>
            
            <div className="form-group">
              <label>
                <FaKey /> New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="8"
                placeholder="Enter your new password"
              />
              <small>Password must be at least 8 characters long</small>
            </div>
            
            <div className="form-group">
              <label>
                <FaKey /> Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength="8"
                placeholder="Confirm your new password"
              />
            </div>
            
            <button 
              type="submit" 
              className="reset-button"
              disabled={loading}
            >
              Reset Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
