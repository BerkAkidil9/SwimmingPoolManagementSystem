import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import poolImage from "../pool.jpg";
import "./LoginPage.css";

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

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    document.title = "Welcome Back - Swimming Pool Project";
  }, []);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "verify_email") {
      setError("Please verify your email address. Click the link we sent you and then try logging in again.");
    } else if (err === "health_rejected") {
      setError("Your health assessment has been rejected. You are unable to participate in swimming activities. Access is no longer available.");
    } else if (err === "verification_banned") {
      setError("Your account has reached the maximum number of verification attempts. Access is no longer available. Please contact support or create a new account.");
    }
  }, [searchParams]);

  const handleSocialLogin = (provider) => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    window.location.href = `${apiUrl}/auth/${provider}`;
  };

  const handleSubmit = async (e, isRetry = false) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await axios.post(
        "/auth/login",
        { email, password },
        { withCredentials: true, timeout: 60000 }
      );

      if (response.data.isAuthenticated) {
        const user = response.data.user;
        if (user?.role) user.role = String(user.role).toLowerCase().trim();
        sessionStorage.setItem("user", JSON.stringify(user));
        navigate("/home");
      } else {
        setError("Invalid email or password.");
      }
    } catch (err) {
      if (!isRetry && (err.code === "ECONNABORTED" || err.message?.includes("timeout") || !err.response)) {
        try {
          const retryRes = await axios.post("/auth/login", { email, password }, { withCredentials: true, timeout: 60000 });
          if (retryRes.data.isAuthenticated) {
            const user = retryRes.data.user;
            if (user?.role) user.role = String(user.role).toLowerCase().trim();
            sessionStorage.setItem("user", JSON.stringify(user));
            navigate("/home");
            return;
          }
        } catch (_) {}
      }
      setError(err.response?.data?.error || "Sunucu yanıt vermedi. Birkaç saniye sonra tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
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
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Giriş yapılıyor..." : "Sign In"}
          </button>
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
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
