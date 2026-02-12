import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUser, FaSignOutAlt, FaTachometerAlt, FaCreditCard, FaUserEdit, FaUserCircle, FaSwimmer } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Get user from session storage
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        
        // Fetch additional user data from the backend
        fetchUserProfile();
      } catch (error) {
        console.error('Error parsing user data:', error);
        setError('Failed to load profile data. Please try again later.');
      }
    }

    // Add click event listener to close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/api/member/profile', { withCredentials: true });
      if (response.data) {
        const updatedUserData = { ...user, ...response.data };
        setUser(updatedUserData);
        sessionStorage.setItem('user', JSON.stringify(updatedUserData));
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load profile data. Please try again later.');
    }
  };

  const handleLogout = async () => {
    try {
      // Use the correct logout endpoint
      await axios.get('/auth/clear-session', { withCredentials: true });
      sessionStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const navigateToDashboard = () => {
    if (user && user.role) {
      const role = user.role.toLowerCase();
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'doctor') {
        navigate('/doctor/dashboard');
      } else if (role === 'coach') {
        navigate('/coach/dashboard');
      } else if (role === 'staff') {
        navigate('/staff/verification');
      } else {
        navigate('/member/dashboard');
      }
    } else {
      navigate('/dashboard');
    }
    setDropdownOpen(false);
  };

  const getDashboardLabel = () => {
    if (!user || !user.role) return 'Dashboard';
    const role = user.role.toLowerCase();
    if (role === 'admin') return 'Admin Panel';
    if (role === 'doctor') return 'Doctor Dashboard';
    if (role === 'coach') return 'Coach Dashboard';
    if (role === 'staff') return 'Staff Verification';
    return 'Member Dashboard';
  };

  // Get profile image URL based on available data
  const getProfileImageUrl = () => {
    if (!user) return null;

    // Check for profile photo path from manual upload
    if (user.profile_photo_path) {
      return `/uploads/${user.profile_photo_path}`;
    }
    
    // Check for social provider profile picture
    if (user.profile_picture) {
      return user.profile_picture;
    }
    
    return null;
  };

  return (
    <nav className="navbar-container">
      <div className="navbar-content">
        <div className="navbar-logo">
          <Link to="/home">Swim Center</Link>
        </div>
        
        {user && (
          <div className="profile-container" ref={dropdownRef}>
            <div className="profile-icon" onClick={toggleDropdown}>
              <div className="user-logo">
                <FaUserCircle />
              </div>
            </div>
            
            {dropdownOpen && (
              <div className="profile-dropdown">
                <div className="user-info">
                  <span className="user-name">{user.name} {user.surname}</span>
                  <span className="user-email">{user.email}</span>
                  {error && <span className="error-message">{error}</span>}
                </div>
                
                <ul className="dropdown-menu">
                  {user ? (
                    <>
                      <li>
                        <div onClick={navigateToDashboard} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          <FaTachometerAlt /> {getDashboardLabel()}
                        </div>
                      </li>
                      {['admin', 'doctor', 'coach'].includes(user?.role?.toLowerCase()) && (
                        <li>
                          <Link to="/member/dashboard" onClick={() => setDropdownOpen(false)}>
                            <FaSwimmer /> Member Dashboard
                          </Link>
                        </li>
                      )}
                      <li>
                        <Link to="/billing">
                          <FaCreditCard /> Billing
                        </Link>
                      </li>
                      <li>
                        <Link to="/edit-profile">
                          <FaUserEdit /> Edit Profile
                        </Link>
                      </li>
                      <li onClick={handleLogout}>
                        <FaSignOutAlt /> Logout
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <Link to="/login">Login</Link>
                      </li>
                      <li>
                        <Link to="/register">Register</Link>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
