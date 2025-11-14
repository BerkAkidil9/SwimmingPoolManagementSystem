import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';  // Create this if you don't have it

const ProtectedRoute = ({ children, isAdmin, isDoctor, isStaff, isCoach, allowedRoles = ['user', 'admin', 'doctor', 'staff', 'coach'] }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('/auth/check-auth', { withCredentials: true });
        console.log('Auth check response:', response.data);
        
        if (response.data.isAuthenticated && response.data.user) {
          setIsAuthenticated(true);
          const userData = response.data.user;
          console.log('ProtectedRoute - Original user data:', userData);
          console.log('ProtectedRoute - User role before setting:', userData.role);
          console.log('ProtectedRoute - Role type:', typeof userData.role);
          
          // Ensure role is normalized
          if (userData && userData.role) {
            const normalizedRole = String(userData.role).toLowerCase().trim();
            console.log('ProtectedRoute - Normalized role:', normalizedRole);
            userData.role = normalizedRole;
          }
          
          setUser(userData);
          // Update session storage
          sessionStorage.setItem('user', JSON.stringify(userData));
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <div className="loading-container"><LoadingSpinner /></div>;
  }

  if (!isAuthenticated) {
    // Redirect to login with a return URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check for admin access if required
  if (isAdmin && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Check for doctor access if required
  if (isDoctor && user?.role !== 'doctor') {
    return <Navigate to="/dashboard" replace />;
  }

  // Check for staff access if required
  if (isStaff && user?.role !== 'staff') {
    return <Navigate to="/dashboard" replace />;
  }
  if (isCoach && user?.role !== 'coach') {
    return <Navigate to="/dashboard" replace />;
  }

  // Check for role-based access
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;