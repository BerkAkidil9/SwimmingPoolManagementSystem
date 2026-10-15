import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaInfoCircle } from 'react-icons/fa';
import { API_BASE_URL } from '../../config';
import './EmailVerification.css';

// Token from URL path (legacy) or from hash fragment (secure - not sent in Referer/logs)
function getTokenFromLocation() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const params = new URLSearchParams(hash);
    return params.get('token') || '';
  }
  return null;
}

const EmailVerification = () => {
  const tokenFromParams = useParams().token;
  const tokenFromHash = useMemo(getTokenFromLocation, []);
  const token = tokenFromParams || tokenFromHash || '';
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  const verifyEmail = useCallback(async (abortSignal) => {
    if (!token) {
      setStatus("link_expired");
      setMessage("Invalid verification link. Please request a new verification email.");
      return;
    }

    // Check if we've already verified this token (from previous visit in same browser)
    const verifiedToken = localStorage.getItem("verified_token");
    if (verifiedToken === token) {
      setStatus("link_used");
      setMessage("This verification link has already been used. Your email is verified.");
      return;
    }

    try {
      // Token in body to avoid URL encoding/truncation issues
      const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ token }),
        signal: abortSignal,
      });

      let data = {};
      try {
        data = await response.json();
      } catch (_) {
        data = { message: "Server error. Please try again." };
      }
      console.log("Verification response:", response.status, data);

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
        setMessage(data.message || "This verification link has expired. Please request a new verification email from the login page.");
      }
    } catch (error) {
      if (error.name === "AbortError") return; // Ignore abort from Strict Mode
      console.error("Verification error:", error);
      setStatus("link_expired");
      setMessage("This verification link has expired. Please request a new verification email from the login page.");
    }
  }, [token, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    verifyEmail(controller.signal);
    return () => controller.abort(); // Cancel if effect re-runs (Strict Mode) or unmount
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
