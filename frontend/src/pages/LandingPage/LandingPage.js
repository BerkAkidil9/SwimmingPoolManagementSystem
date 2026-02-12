import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import poolImage from '../../logo/ozu_havuz_0.jpg';
import Pools from '../Pools/Pools';

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className="navbar">
        <a href="#hero-section" className="navbar-logo">Swim Center</a>
        <ul className="navbar-list">
          <li><a href="#hero-section">Home</a></li>
          <li><a href="#about-section">About Us</a></li>
          <li><a href="#packages-section">Packages</a></li>
          <li><a href="#pool-list-section">Pools</a></li>
        </ul>
      </nav>

      {/* Hero Section */}
      <header id="hero-section" className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to the Swimming Center</h1>
          <p className="hero-subtitle">
            Dive into a world of health and fitness with state-of-the-art swimming facilities.
          </p>
          <div className="cta-buttons">
            <Link to="/register" className="primary-button">Register Now</Link>
            <Link to="/login" className="secondary-button">Login</Link>
          </div>
        </div>
        <img src={poolImage} alt="Swimming Pool" className="hero-image" />
      </header>

      {/* About Section */}
      <section id="about-section" className="about-section">
  <h2>  About Us </h2>
  <p>
    At Swimming Center, we are passionate about creating a welcoming space for individuals of all ages and abilities to explore the joys of swimming. With state-of-the-art facilities and a commitment to excellence, we proudly serve as the city’s premier destination for swimming, fitness, and relaxation.
  </p>
  <h3>Our Mission</h3>
  <p>
    Our mission is to promote a healthy, active lifestyle through swimming. Whether you are here to learn, train, or simply enjoy some quality time in the water, Swimming Center is dedicated to providing a safe, inclusive, and supportive environment.
  </p>
  <h3>Why Choose Swimming Center?</h3>
  <ul>
    <li><strong>Modern Facilities:</strong> Our pools are equipped with advanced technology to ensure maximum comfort, hygiene, and safety.</li>
    <li><strong>Tailored Packages:</strong> We offer two unique packages—the Education Package for beginners and the Free Swimming Package for experienced swimmers—designed to suit your goals and schedule.</li>
    <li><strong>Expert Team:</strong> From skilled coaches to attentive lifeguards and medical professionals, our team is here to support your journey.</li>
    <li><strong>Convenience Across the City:</strong> With multiple swimming pools in prime locations, you’re never far from a Swimming Center near you.</li>
    <li><strong>Effortless Booking:</strong> Our easy-to-use platform lets you reserve sessions in just a few clicks.</li>
  </ul>
  <h3>Commitment to Safety and Health</h3>
  <p>
    At Swimming Center, your well-being is our priority. We ensure thorough registration, health checks, and safety measures, so you can swim with peace of mind. Our professional staff monitors every aspect of your experience to maintain the highest standards of care.
  </p>
  <h3>Join Us Today!</h3>
  <p>
    Dive into a world of possibilities at Swimming Center. Whether you’re learning to swim, pursuing health and fitness, or training to reach your peak performance, we are here to support you every step of the way.
  </p>
  <p><strong>Let’s make every swim a memorable one at Swimming Center—where fitness meets fun!</strong></p>
</section>


      {/* Packages Section */}
      <section id="packages-section" className="packages-section">
        <h2>Our Packages</h2>
        <div className="packages-container">
  <div className="package-card">
    <h3>Education Package</h3>
    <p><strong>Usage:</strong> 7:00 AM - 6:00 PM</p>
    <p><strong>Sessions:</strong> 12 times</p>
    <p>Learn swimming with expert instructors in a structured environment.</p>
    <Link to="/education-package" className="package-button">Learn More</Link>
  </div>
  <div className="package-card">
    <h3>Free Swimming Package</h3>
    <p><strong>Usage:</strong> 7:00 AM - 12:00 AM</p>
    <p><strong>Sessions:</strong> 18 times</p>
    <p>Perfect for experienced swimmers focusing on fitness and health.</p>
    <Link to="/free-swimming-package" className="package-button">Learn More</Link>
  </div>
</div>

      </section>

      {/* Pool List Section */}
      <section id="pool-list-section" className="pool-list-section">
        <h2>Available Pools</h2>
        <Pools />
      </section>

      {/* Footer */}
      <footer className="footer">
        <a href="#hero-section" className="footer-logo">Swim Center</a>
        <p>&copy; 2025 Swimming Center. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
