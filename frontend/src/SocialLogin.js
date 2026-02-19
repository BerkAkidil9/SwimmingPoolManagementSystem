import React from 'react';
import googleLogo from './logo/google logo.png';

const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function SocialLogin() {
  return (
    <div className="social-login">
      <h3>Register with Google</h3>
      <div className="social-login-buttons">
        <a
          href={`${apiBaseUrl}/auth/google`}
          aria-label="Register with Google"
          className="social-button-link"
        >
          <div className="social-button google-button">
            <img src={googleLogo} alt="Google logo" className="social-logo" />
          </div>
        </a>
      </div>
    </div>
  );
}

export default SocialLogin;