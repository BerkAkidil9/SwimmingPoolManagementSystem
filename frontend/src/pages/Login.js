import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import poolImage from "../pool.jpg";
import "./LoginPage.css";
import facebookLogo from '../logo/facebook logo.png';

const GoogleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 48 48"
    fill="none"
  >
    <path
      fill="#EA4335"
      d="M24 9.5c3.6 0 6.7 1.3 9.2 3.9l7-7C35.4 2.3 30.1 0 24 0 14.7 0 6.6 5.7 2.8 13.9l8.3 6.4C13 12.3 18.1 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.1 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.4c-.6 2.9-2.4 5.4-4.9 7.1l7.5 5.8c4.4-4.1 7.1-10.2 7.1-17.2z"
    />
    <path
      fill="#FBBC04"
      d="M12.7 28.3c-.8-2.4-.8-5.2 0-7.6l-8.3-6.4c-3.6 7.1-3.6 15.5 0 22.6l8.3-6.4z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.5 0 11.9-2.1 15.8-5.7l-7.5-5.8c-2.1 1.4-4.9 2.3-8.3 2.3-5.9 0-10.9-3.8-12.7-9.2l-8.3 6.4C6.6 42.3 14.7 48 24 48z"
    />
    <path fill="none" d="M0 0h48v48H0z" />
  </svg>
);

const GitHubIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.4.6.1.8-.3.8-.6v-2c-3.3.7-4-1.4-4-1.4-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1.8 2 .8 2 1.8 3.1 5.4 2.2 6.7 1.7.2-1.2.7-2.2 1.2-2.8-2.6-.3-5.3-1.3-5.3-5.7 0-1.2.4-2.3 1.1-3.2-.1-.3-.4-1.2.1-2.5 0 0 1-.3 3.2 1.1a11 11 0 0 1 5.8 0c2.2-1.4 3.2-1.1 3.2-1.1.5 1.3.2 2.2.1 2.5.7 1 1.1 2 1.1 3.2 0 4.4-2.7 5.4-5.3 5.7.8.6 1.4 1.6 1.4 3.2v4.5c0 .3.2.8.8.6C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const FacebookIcon = () => (
  <img 
    src={facebookLogo} 
    alt="Facebook Logo" 
    style={{ 
      width: '18px', 
      height: '18px',
      marginRight: '10px'
    }} 
  />
);

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Welcome Back - Swimming Pool Project";
  }, []);

  const handleSocialLogin = (provider) => {
    window.location.href = `http://localhost:3001/auth/${provider}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post(
        "/auth/login",
        { email, password },
        { withCredentials: true }
      );

      if (response.data.isAuthenticated) {
        const user = response.data.user;
        console.log("LOGIN - User data from server:", user);
        console.log("LOGIN - User role:", user.role);
        console.log("LOGIN - Role type:", typeof user.role);
        console.log("LOGIN - Role stringified:", JSON.stringify(user.role));
        console.log("LOGIN - Role character codes:", [...String(user.role)].map(c => c.charCodeAt(0)));
        
        // Ensure role is stored correctly
        const normalizedRole = String(user.role || '').toLowerCase().trim();
        console.log("LOGIN - Normalized role:", normalizedRole);
        user.role = normalizedRole; // Make sure we store normalized role

        sessionStorage.setItem("user", JSON.stringify(user));
        console.log(
          "LOGIN - Stored in session:",
          JSON.parse(sessionStorage.getItem("user"))
        );

        // Redirect to homepage - logged-in users land here first
        navigate("/home");
      } else {
        setError("Invalid email or password.");
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "An error occurred. Please try again."
      );
    }
  };

  return (
    <div
      className="login-screen"
      style={{
        backgroundImage: `url(${poolImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Link to="/" className="login-page-logo">Swim Center</Link>
      <div className="login-container">
        <h2>Login to Your Account</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="password-input-container">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onCopy={(e) => e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
            />
            <button
              type="button"
              className="password-toggle-button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "0",
                display: "flex",
                alignItems: "center",
              }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit">Sign In</button>
        </form>
        <Link to="/forgot-password" className="forgot-password">
          Forgot your password?
        </Link>
        <div className="register-prompt">
          Don't have an account? <Link to="/register">Register here</Link>
        </div>
        <div className="divider">
          <span>OR</span>
        </div>
        <div className="social-buttons">
          <button
            className="google"
            onClick={() => handleSocialLogin("google")}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            className="github"
            onClick={() => handleSocialLogin("github")}
          >
            <GitHubIcon />
            Continue with GitHub
          </button>
          <button
            className="facebook"
            onClick={() => handleSocialLogin("facebook")}
          >
            <FacebookIcon />
            Continue with Facebook
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
