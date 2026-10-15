import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './VerifyResult.css';

const VerifyResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get("status");
  const message = searchParams.get("message");

  useEffect(() => {
    if (status === "success") {
      const t = setTimeout(() => navigate("/login"), 3000);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  if (status === "success") {
    return (
      <div className="verify-result-container">
        <div className="verify-result-card">
          <FaCheckCircle className="success-icon" />
          <h2>Email Verified!</h2>
          <p>Your email has been verified successfully. You can now log in.</p>
          <p className="redirect-message">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-result-container">
      <div className="verify-result-card error">
        <FaTimesCircle className="error-icon" />
        <h2>Link Expired or Invalid</h2>
        <p>
          {message === "expired" 
            ? "This verification link has expired." 
            : "This verification link is invalid or has already been used."}
        </p>
        <p>Please request a new verification email from the login page.</p>
        <button className="login-button" onClick={() => navigate("/login")}>
          Go to Login
        </button>
      </div>
    </div>
  );
};

export default VerifyResult;
