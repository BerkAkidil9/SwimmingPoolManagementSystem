import React from 'react';
import { FaGoogle, FaGithub, FaFacebook } from 'react-icons/fa';

// Paths to your logo images
import googleLogo from './logo/google logo.png';
import githubLogo from './logo/github logo.png';
import facebookLogo from './logo/facebook logo.png';

const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function SocialLogin() {
  return (
    <div className="social-login">
      <h3>Register with Social Media</h3>
      <div className="social-login-buttons">
        {/* Google Button */}
        <a
          href={`${apiBaseUrl}/auth/google`}
          aria-label="Register with Google"
          className="social-button-link"
        >
          <div className="social-button google-button">
            <img src={googleLogo} alt="Google logo" className="social-logo" />
          </div>
        </a>

        {/* GitHub Button */}
        <a
          href={`${apiBaseUrl}/auth/github`}
          aria-label="Register with GitHub"
          className="social-button-link"
        >
          <div className="social-button github-button">
            <img src={githubLogo} alt="GitHub logo" className="social-logo" />
          </div>
        </a>

        {/* Facebook Button */}
        <a
          href={`${apiBaseUrl}/auth/facebook`}
          aria-label="Register with Facebook"
          className="social-button-link"
        >
          <div className="social-button facebook-button">
            <img src={facebookLogo} alt="Facebook logo" className="social-logo" />
          </div>
        </a>
      </div>
    </div>
  );
}

export default SocialLogin;