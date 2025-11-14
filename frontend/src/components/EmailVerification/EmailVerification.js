import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import './EmailVerification.css';

const EmailVerification = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  const verifyEmail = useCallback(async () => {
    // Check if we've already verified this token to prevent duplicate requests
    const verifiedToken = localStorage.getItem("verified_token");
    if (verifiedToken === token) {
      setStatus("success");
      setMessage("Email verification successful. You can now login to your account.");
      setTimeout(() => navigate("/login"), 3000);
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/auth/verify-email/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for session
      });

      const data = await response.json();
      console.log("Verification response:", data);

      if (response.ok) {
        // Store the token as verified to prevent duplicate verification attempts
        localStorage.setItem("verified_token", token);
        
        setStatus("success");
        setMessage(data.message);
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setStatus("error");
        setMessage(data.message || "Verification failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setStatus("error");
      setMessage("An error occurred during verification");
    }
  }, [token, navigate]);

  useEffect(() => {
    // Only verify if we haven't already verified this token
    verifyEmail();
  }, [verifyEmail]);

  return (
    <div className="email-verification-container">
      <div className="email-verification-card">
        {status === "verifying" && (
          <>
            <FaSpinner className="spinner" />
            <h2>Verifying your email...</h2>
            <p>Please wait while we verify your email address.</p>
          </>
        )}

        {status === "success" && (
          <>
            <FaCheckCircle className="success-icon" />
            <h2>Email Verified!</h2>
            <p>{message}</p>
            <p className="redirect-message">Redirecting to login page...</p>
          </>
        )}

        {status === "error" && (
          <>
            <FaTimesCircle className="error-icon" />
            <h2>Verification Failed</h2>
            <p>{message}</p>
            <button 
              className="login-button" 
              onClick={() => navigate("/login")}
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;
