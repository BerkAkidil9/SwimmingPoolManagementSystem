import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import MultiStepForm from "./components/MultiStepForm/MultiStepForm";
import Terms from "./Terms";
import SocialLogin from "./SocialLogin";
import PrivacyPolicy from "./components/PrivacyPolicy/PrivacyPolicy";
import LoginPage from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EmailVerification from "./components/EmailVerification/EmailVerification";
import VerifyResult from "./components/VerifyResult/VerifyResult";
import LandingPage from "./pages/LandingPage/LandingPage"; 
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";
import AdminDashboard from "./components/AdminDashboard/AdminDashboard";
import DoctorDashboard from "./components/DoctorDashboard/DoctorDashboard";
import HealthReportUpload from "./components/HealthReportUpload";
import axios from "axios";
import MemberDashboard from './components/MemberDashboard';
import CheckInPage from './components/CheckInPage';
import StaffVerification from './components/StaffVerification';
import EducationPackage from "./pages/packages/EducationPackage"; 
import FreeSwimmingPackage from "./pages/packages/FreeSwimmingPackage"; 
import Billing from "./pages/Billing";
import EditProfile from "./pages/EditProfile";
import ResetPassword from "./pages/ResetPassword";
import CoachDashboard from "./components/CoachDashboard/CoachDashboard";
import ForgotPassword from './pages/ForgotPassword';
import HomePage from './pages/HomePage/HomePage';


// Set default base URL for axios
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
axios.defaults.withCredentials = true;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Set default locale for dates
    if (Intl && Intl.DateTimeFormat) {
      Intl.DateTimeFormat().resolvedOptions().timeZone = 'Europe/Istanbul';
    }
    
    // Add global method to Date prototype for consistent Turkish time handling
    Date.prototype.toTurkishTime = function() {
      const turkishDate = new Date(this);
      turkishDate.setTime(this.getTime() + (3 * 60 * 60 * 1000)); // Add 3 hours for Turkish time
      
      return turkishDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Use 24-hour format
      });
    };

    const checkAuth = async () => {
      try {
        const response = await axios.get('/auth/check-auth', { withCredentials: true });
        setIsAuthenticated(response.data.isAuthenticated);
        
        if (response.data.isAuthenticated && response.data.user) {
          sessionStorage.setItem('user', JSON.stringify(response.data.user));
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <Routes>
            {/* Landing Page Route */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Register Route */}
            <Route
              path="/register"
              element={
                <div className="registration-container">
                  <MultiStepForm />
                </div>
              }
            />

            {/* Social Registration Route */}
            <Route
              path="/register/social"
              element={
                <div className="registration-container">
                  <MultiStepForm isSocialRegistration={true} />
                </div>
              }
            />

            {/* Terms and Privacy Policy */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />

            {/* Social Login */}
            <Route
              path="/social-login"
              element={
                <div className="social-login-container">
                  <SocialLogin />
                </div>
              }
            />

            {/* Login Page */}
            <Route path="/login" element={<LoginPage />} />

            {/* Home Page - for logged-in users */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />

            {/* Dashboard (Protected Route) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Email verification: token in hash (secure) or in path (legacy) */}
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/verify-email/:token" element={<EmailVerification />} />
            <Route path="/verify-result" element={<VerifyResult />} />

            {/* Admin Dashboard */}
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute isAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Doctor Dashboard */}
            <Route 
              path="/doctor/dashboard" 
              element={
                <ProtectedRoute isDoctor={true}>
                  <DoctorDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Health Report Upload - requires login; email links may use /upload-health-report or /upload-health-report/:userId */}
            <Route path="/health-report-upload" element={
              <ProtectedRoute>
                <HealthReportUpload />
              </ProtectedRoute>
            } />
            <Route path="/upload-health-report" element={
              <ProtectedRoute>
                <HealthReportUpload />
              </ProtectedRoute>
            } />
            <Route path="/upload-health-report/:userId" element={
              <ProtectedRoute>
                <HealthReportUpload />
              </ProtectedRoute>
            } />
            {/* Coach Dashboard Route */}
            <Route 
              path="/coach/dashboard" 
              element={
                <ProtectedRoute isCoach={true}>
                  <CoachDashboard />
                </ProtectedRoute>
              } 
            />
            {/* Coach Dashboard (direct access removed - use /coach/dashboard with auth) */}
            {/* Member Dashboard */}
            <Route 
              path="/member/dashboard" 
              element={
                <ProtectedRoute>
                  <MemberDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Check-In Page */}
            <Route 
              path="/check-in" 
              element={
                <ProtectedRoute>
                  <CheckInPage />
                </ProtectedRoute>
              } 
            />

            {/* Billing Page */}
            <Route 
              path="/billing" 
              element={
                <ProtectedRoute>
                  <Billing />
                </ProtectedRoute>
              } 
            />

            {/* Edit Profile Page */}
            <Route 
              path="/edit-profile" 
              element={
                <ProtectedRoute>
                  <EditProfile />
                </ProtectedRoute>
              } 
            />

            {/* Education Package */}
            <Route path="/education-package" element={
              <ProtectedRoute>
                <EducationPackage />
              </ProtectedRoute>
            } />

            {/* Free Swimming Package */}
            <Route path="/free-swimming-package" element={
              <ProtectedRoute>
                <FreeSwimmingPackage />
              </ProtectedRoute>
            } />
            
            {/* Reset password: token in hash (secure) or in path (legacy) */}
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            
            {/* Forgot Password */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Staff Verification Portal */}
            <Route 
              path="/staff/verification" 
              element={
                <ProtectedRoute isStaff={true} allowedRoles={['staff']}>
                  <StaffVerification />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </header>
      </div>
    </Router>
  );
}

export default App;