import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaInfoCircle } from 'react-icons/fa';
import './EmailVerification.css';

const EmailVerification = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  const verifyEmail = useCallback(async () => {
    // Check if we've already verified this token (from previous visit in same browser)
    const verifiedToken = localStorage.getItem("verified_token");
    if (verifiedToken === token) {
      setStatus("link_used");
      setMessage("This verification link has already been used. Your email is verified.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/auth/verify-email/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const data = await response.json();
      console.log("Verification response:", data);

      if (response.ok) {
        if (data.alreadyVerified) {
          setStatus("link_used");
          setMessage("This verification link has already been used. Your email is verified.");
          return;
        }
        localStorage.setItem("verified_token", token);
        setStatus("success");
        setMessage(data.message);
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setStatus("link_expired");
        setMessage("This verification link has expired. Please request a new verification email from the login page.");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setStatus("link_expired");
      setMessage("This verification link has expired. Please request a new verification email from the login page.");
    }
  }, [token, navigate]);

  useEffect(() => {
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

        {status === "link_used" && (
          <>
            <FaInfoCircle className="link-used-icon" />
            <h2>Link Already Used</h2>
            <p>{message}</p>
            <button 
              className="login-button" 
              onClick={() => navigate("/login")}
            >
              Go to Login
            </button>
          </>
        )}

        {status === "link_expired" && (
          <>
            <FaTimesCircle className="error-icon" />
            <h2>Link Expired</h2>
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
