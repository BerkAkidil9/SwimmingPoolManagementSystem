import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaEnvelope, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate('/login'), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/auth/reset-password-request', { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      {success && (
        <div className="success-toast">
          <FaCheckCircle className="success-toast-icon" />
          <span>Check your email. Redirecting to login...</span>
        </div>
      )}

      {!success && (
      <div className="forgot-password-form">
        <h1>Reset Your Password</h1>

        {error && (
          <div className="error-message">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>
                <FaEnvelope /> Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email address"
              />
            </div>
            <button 
              type="submit" 
              className="reset-button"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button 
              type="button" 
              className="return-button"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </form>
      </div>
      )}
    </div>
  );
};

export default ForgotPassword;