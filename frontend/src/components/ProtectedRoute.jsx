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
    const checkAuth = async (retry = false) => {
      try {
        setIsLoading(true);
        const response = await axios.get('/auth/check-auth', {
          withCredentials: true,
          timeout: 60000, // 60s for Render cold start
        });
        if (response.data.isAuthenticated && response.data.user) {
          setIsAuthenticated(true);
          const userData = response.data.user;
          if (userData?.role) {
            userData.role = String(userData.role).toLowerCase().trim();
          }
          setUser(userData);
          sessionStorage.setItem('user', JSON.stringify(userData));
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        if (!retry && (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || !error.response)) {
          await checkAuth(true);
          return;
        }
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