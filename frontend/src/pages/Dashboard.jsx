import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Get user details from session storage
    const userStr = sessionStorage.getItem('user');
    console.log("Dashboard - Session user data:", userStr);
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log("Dashboard - Parsed user data:", user);
        console.log("Dashboard - User role:", user.role);
        console.log("Dashboard - User role type:", typeof user.role);
        
        // Ensure role is a string and normalize to lowercase
        const roleStr = String(user.role || '').toLowerCase().trim();
        console.log("Dashboard - Normalized role for comparison:", roleStr);
        console.log("Dashboard - Role type after conversion:", typeof roleStr);
        console.log("Dashboard - Coach strict equality check:", roleStr === 'coach');
        console.log("Dashboard - Coach includes check:", roleStr.includes('coach'));
        console.log("Dashboard - Role string length:", roleStr.length);
        console.log("Dashboard - Role character codes:", [...roleStr].map(c => c.charCodeAt(0)));
        
        // Redirect based on role
        if (roleStr === 'admin') {
          console.log("Dashboard - Redirecting to ADMIN dashboard");
          navigate('/admin');
        } else if (roleStr === 'doctor') {
          console.log("Dashboard - Redirecting to DOCTOR dashboard");
          navigate('/doctor/dashboard');
        } else if (roleStr === 'coach') {
          console.log("Dashboard - Redirecting to COACH dashboard");
          navigate('/coach/dashboard');  
        } else {
          console.log("Dashboard - Redirecting to MEMBER dashboard");
          navigate('/member/dashboard');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        // If there's an error, redirect to login
        navigate('/login');
      }
    } else {
      // If no user data, redirect to login
      console.log("Dashboard - No user data found, redirecting to login");
      navigate('/login');
    }
  }, [navigate]);
  
  // Return a loading state while redirecting
  return <div className="text-center mt-5">
    <h3>Redirecting to your dashboard...</h3>
    <p>Please wait while we direct you to the appropriate dashboard.</p>
  </div>;
};

export default Dashboard;
