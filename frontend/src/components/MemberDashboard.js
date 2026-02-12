import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './MemberDashboard.css';
import PackagePurchase from './PackagePurchase';
import { FaSwimmer, FaCalendarAlt, FaTicketAlt, FaTimes, FaClock, FaCheckCircle, FaMapMarkerAlt, FaGraduationCap, FaCommentAlt, FaCheck, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import TransactionHistory from './TransactionHistory';
import Navbar from './Navbar/Navbar';

const MemberDashboard = () => {
  const [pools, setPools] = useState([]);
  const [selectedPool, setSelectedPool] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [userPackage, setUserPackage] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPackagePurchase, setShowPackagePurchase] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [showFeedbackHistory, setShowFeedbackHistory] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState({ packages: [], reservations: [] });
  const [successMessage, setSuccessMessage] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationReason, setVerificationReason] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);
  const idCardRef = useRef(null);
  const profilePhotoRef = useRef(null);
  const [userProfile, setUserProfile] = useState({
    name: '',
    surname: '',
    dateOfBirth: '',
    phone: '',
    gender: '',
    health_status: 'pending'
  });
  const [healthStatusWarning, setHealthStatusWarning] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [formValid, setFormValid] = useState(false);
  const MAX_REJECTIONS = 3;
  // Check-in functionality moved to separate page

  useEffect(() => {
    fetchUserData();
    fetchPools();
    fetchReservations();
    fetchTransactionHistory();
    fetchVerificationStatus();
    fetchUserHealthStatus();
  }, []);

  useEffect(() => {
    if (showFeedbackHistory) {
      fetchFeedbackHistory();
    }
  }, [showFeedbackHistory]);

  const fetchUserData = async () => {
    try {
      const response = await axios.get('/api/member/package');
      console.log('Package data:', response.data);
      setUserPackage(response.data);
      setError('');
    } catch (error) {
      console.error('Package fetch error:', error);
      setError('Failed to fetch user package information');
    }
  };

  const fetchPools = async () => {
    try {
      const response = await axios.get('/api/pools');
      console.log('Fetched pools:', response.data);
      
      // When fetching pools, also get session counts for each pool
      const poolsWithCounts = await Promise.all(response.data.map(async pool => {
        try {
          // Get education session count
          const educationRes = await axios.get(`/api/member/pools/${pool.id}/sessions/count?type=education`);
          
          // Get free swimming session count
          const freeSwimmingRes = await axios.get(`/api/member/pools/${pool.id}/sessions/count?type=free_swimming`);
          
          return {
            ...pool,
            educationSessionCount: educationRes.data.count || 0,
            freeSwimmingSessionCount: freeSwimmingRes.data.count || 0
          };
        } catch (err) {
          console.error(`Error fetching counts for pool ${pool.id}:`, err);
          return {
            ...pool,
            educationSessionCount: 0,
            freeSwimmingSessionCount: 0
          };
        }
      }));
      
      console.log('Pools with counts:', poolsWithCounts);
      setPools(poolsWithCounts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pools:', error);
      setError('Failed to load pools. Please try again.');
      setLoading(false);
    }
  };

  const fetchSessions = async (poolId) => {
    try {
      const response = await axios.get(`/api/member/pools/${poolId}/sessions`);
      console.log(`Received ${response.data.length} sessions from API for pool ${poolId}`);
      
      // Apply additional client-side validation for extra safety
      const validatedSessions = response.data.filter(session => {
        // Use the hours_until field added by the backend
        if (session.hours_until <= 0) {
          console.error(`Filtering out past session from API response: ${session.id}`);
          return false;
        }
        return true;
      });
      
      // If we filtered any sessions, log it
      if (validatedSessions.length !== response.data.length) {
        console.warn(`Removed ${response.data.length - validatedSessions.length} past sessions from API response`);
      }
      
      // Apply our regular filtering logic
      const filteredSessions = filterExpiredSessions(validatedSessions);
      console.log(`After filtering: ${filteredSessions.length} sessions`);
      
      setSessions(filteredSessions);
      return filteredSessions;
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load sessions. Please try again.');
      return [];
    }
  };

  const fetchReservations = async () => {
    try {
      const response = await axios.get('/api/member/reservations');
      setReservations(response.data);
    } catch (error) {
      setError('Failed to fetch reservations');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbackHistory = async () => {
    try {
      const response = await axios.get('/api/member/feedback');
      setFeedbackHistory(response.data);
    } catch (error) {
      console.error('Error fetching feedback history:', error);
      setError('Failed to load feedback history');
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      const response = await axios.get('/api/member/history');
      setTransactionHistory(response.data);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setError('Failed to load transaction history');
    }
  };

  const fetchVerificationStatus = async () => {
    try {
      const response = await axios.get('/api/member/verification-status');
      setVerificationStatus(response.data.status);
      setVerificationReason(response.data.reason || '');
      
      // Fetch user profile when verification status is loaded
      fetchUserProfile();
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/api/member/profile');
      if (response.data) {
        setUserProfile({
          name: response.data.name || '',
          surname: response.data.surname || '',
          dateOfBirth: response.data.date_of_birth ? response.data.date_of_birth.substring(0, 10) : '',
          phone: response.data.phone || '',
          gender: response.data.gender || '',
          rejection_count: response.data.rejection_count || 0,
          health_status: response.data.health_status || 'pending',
          health_status_reason: response.data.health_status_reason || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to fetch your profile information. Please try again later.');
    }
  };

  const fetchUserHealthStatus = async () => {
    try {
      const response = await axios.get('/api/member');
      if (response.data) {
        setUserProfile(prevProfile => ({
          ...prevProfile,
          health_status: response.data.health_status || 'pending',
          health_status_reason: response.data.health_status_reason || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching health status:', error);
    }
  };

  const handlePoolSelect = (pool) => {
    // Toggle selection if clicking the same pool
    if (selectedPool && selectedPool.id === pool.id) {
      setSelectedPool(null);
      setSessions([]);
      return;
    }
    
    // Set the selected pool immediately
    setSelectedPool(pool);
    
    // Don't show loading state, we'll keep the UI responsive
    // Use a background fetch instead
    if (pool) {
      // Instead of showing a loading indicator, fetch in the background
      axios.get(`/api/member/pools/${pool.id}/sessions`)
        .then(response => {
          console.log(`Received ${response.data.length} sessions from API for pool ${pool.id}`);
          // Log all sessions to debug
          response.data.forEach(session => {
            console.log(`Received session ${session.id} - Type: ${session.type}, Date: ${session.session_date}`);
          });
          const filteredSessions = filterExpiredSessions(response.data);
          console.log(`After filtering: ${filteredSessions.length} sessions`);
          // Log all filtered sessions to debug
          filteredSessions.forEach(session => {
            console.log(`Filtered session ${session.id} - Type: ${session.type}, Date: ${session.session_date}`);
          });
          setSessions(filteredSessions);
        })
        .catch(error => {
          console.error('Error fetching sessions:', error);
          setError('Failed to load sessions. Please try again.');
          setSessions([]);
        });
    }
  };

  const bookSession = async (sessionId) => {
    try {
      await axios.post('/api/member/reservations', { sessionId });
      fetchReservations();
      fetchUserData();
      fetchTransactionHistory();
      if (selectedPool) {
        fetchSessions(selectedPool.id);
      }
      
      // Set success message
      setSuccessMessage('Session booked successfully!');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setError('');
      setHealthStatusWarning('');
    } catch (error) {
      // Check if the error is related to health status
      if (error.response?.data?.healthStatus) {
        // Show health status warning as a popup
        setHealthStatusWarning(error.response?.data?.error || 'Health status not approved for swimming');
        // Clear health status warning after 5 seconds
        setTimeout(() => setHealthStatusWarning(''), 5000);
        // Refresh health status in case it's changed
        fetchUserHealthStatus();
      } else {
        setError(error.response?.data?.error || 'Failed to book session');
      }
    }
  };

  const cancelReservation = async (reservationId) => {
    try {
      await axios.delete(`/api/member/reservations/${reservationId}`);
      
      // Remove the canceled reservation from the list of active reservations
      setReservations(prevReservations => 
        prevReservations.filter(res => res.id !== reservationId)
      );

      // Update the sessions list to reflect the new availability
      if (selectedPool) {
        const response = await axios.get(`/api/member/pools/${selectedPool.id}/sessions`);
        setSessions(response.data);
      }

      // Refresh user package info to show updated session count
      await fetchUserData();
      
      // Refresh transaction history which will still show canceled reservations
      fetchTransactionHistory();
      
      // Set success message
      setSuccessMessage('Reservation canceled successfully!');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      setError(error.response?.data?.error || 'Error canceling reservation');
    }
  };

  const toggleReservationDetails = (reservationId) => {
    if (selectedReservation === reservationId) {
      setSelectedReservation(null);
    } else {
      setSelectedReservation(reservationId);
    }
  };

  const submitFeedback = async () => {
    try {
      await axios.post('/api/member/feedback', {
        subject: feedbackSubject,
        message: feedbackMessage
      });
      setFeedbackSubject('');
      setFeedbackMessage('');
      setFeedbackSubmitted(true);
      setTimeout(() => {
        setShowFeedbackForm(false);
        setShowFeedbackHistory(false);
        setFeedbackSubmitted(false);
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to submit feedback');
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Name validation
    if (!userProfile.name.trim()) {
      errors.name = "Name is required";
    } else if (!/^[A-Za-z\s]{2,50}$/.test(userProfile.name)) {
      errors.name = "Please enter a valid name (2-50 characters, letters only)";
    }
    
    // Surname validation
    if (!userProfile.surname.trim()) {
      errors.surname = "Surname is required";
    } else if (!/^[A-Za-z\s]{2,50}$/.test(userProfile.surname)) {
      errors.surname = "Please enter a valid surname (2-50 characters, letters only)";
    }
    
    // Date of birth validation
    if (!userProfile.dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required";
    } else {
      const birthDate = new Date(userProfile.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (isNaN(birthDate.getTime())) {
        errors.dateOfBirth = "Please enter a valid date";
      } else if (age < 18) {
        errors.dateOfBirth = "You must be at least 18 years old";
      } else if (age > 100) {
        errors.dateOfBirth = "Please check your date of birth";
      }
    }
    
    // Phone validation
    if (!userProfile.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^\+?[0-9\s]{10,15}$/.test(userProfile.phone.replace(/[\s()-]/g, ''))) {
      errors.phone = "Please enter a valid phone number (e.g., +90 555 123 4567)";
    }
    
    // Gender validation
    if (!userProfile.gender) {
      errors.gender = "Please select your gender";
    }
    
    // File upload validation - required if mentioned in rejection reason
    const rejectionLower = verificationReason.toLowerCase();
    
    if (rejectionLower.includes('id') || rejectionLower.includes('identification')) {
      if (!idCardRef.current?.files?.length) {
        errors.idCard = "Please upload your ID card as it was mentioned in the rejection reason";
      }
    }
    
    if (rejectionLower.includes('photo') || rejectionLower.includes('picture') || rejectionLower.includes('image')) {
      if (!profilePhotoRef.current?.files?.length) {
        errors.profilePhoto = "Please upload your profile photo as it was mentioned in the rejection reason";
      }
    }
    
    setFormErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    setFormValid(isValid);
    return isValid;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserProfile(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific error when user corrects a field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleResubmitVerification = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.input-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    const formData = new FormData();
    
    // Add personal information to the form data
    formData.append('name', userProfile.name);
    formData.append('surname', userProfile.surname);
    formData.append('dateOfBirth', userProfile.dateOfBirth);
    formData.append('phone', userProfile.phone);
    formData.append('gender', userProfile.gender);
    
    // Add file uploads if provided
    if (idCardRef.current.files[0]) {
      formData.append('idCard', idCardRef.current.files[0]);
    }
    
    if (profilePhotoRef.current.files[0]) {
      formData.append('profilePhoto', profilePhotoRef.current.files[0]);
    }
    
    try {
      setIsResubmitting(true);
      const response = await axios.post('/api/member/resubmit-verification', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        setSuccessMessage('Personal information and verification documents resubmitted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchVerificationStatus();
        setIsResubmitting(false);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to resubmit verification documents');
      setIsResubmitting(false);
    }
  };

  // Improved time handling with correct date display
  const filterExpiredSessions = (sessionsArray) => {
    if (!sessionsArray || sessionsArray.length === 0) {
      return [];
    }
    
    const now = new Date();
    console.log('Current browser time for filtering:', now.toISOString());
    
    // Filter out sessions in the past
    return sessionsArray.filter(session => {
      // First check if backend already did the calculation for us
      if (session.hours_until !== undefined && session.hours_until > 0) {
        console.log(`Session ${session.id} - Using backend calculation: ${session.hours_until} hours until session`);
        return true;
      }
      
      if (!session.session_date || !session.start_time) {
        console.log(`Session ${session.id} - Missing date or time, filtering out`);
        return false;
      }
      
      // Get the proper date object
      let sessionDate;
      if (session.original_date) {
        sessionDate = new Date(session.original_date);
      } else {
        sessionDate = new Date(session.session_date);
      }
      
      // Extract correct components
      const year = sessionDate.getFullYear();
      const month = sessionDate.getMonth();  // JS months are 0-indexed
      const day = sessionDate.getDate();
      
      // Parse time components
      const [hours, minutes] = session.start_time.split(':').map(Number);
      
      // Create date in local time zone
      const sessionDateTime = new Date(year, month, day, hours, minutes, 0);
      
      const isFuture = sessionDateTime > now;
      const hoursUntilSession = (sessionDateTime - now) / (1000 * 60 * 60);
      
      console.log(`Session ${session.id} - Type: ${session.type}`);
      console.log(`- Date: ${year}-${month+1}-${day}, Time: ${hours}:${minutes}`);
      console.log(`- Session DateTime: ${sessionDateTime.toISOString()}`);
      console.log(`- Future: ${isFuture}, Hours: ${hoursUntilSession.toFixed(2)}`);
      
      return isFuture;
    });
  };

  const formatTurkishTime = (date) => {
    const turkishDate = new Date(date);
    turkishDate.setTime(date.getTime() + (3 * 60 * 60 * 1000));
    return turkishDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Check-in functionality moved to separate page

  // Check-in functionality has been moved to the dedicated CheckInPage component

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-sidebar">
        <div className="user-profile" style={{ textAlign: 'center' }}>
          <div className="profile-info" style={{ width: '100%' }}>
            <div className="logo-container">
              <div className="member-logo" style={{ margin: '0 auto', width: '120px', height: '120px' }}>
                <FaSwimmer style={{ fontSize: '4rem' }} />
              </div>
              <h2 style={{ fontSize: '2.5rem' }}>Member Dashboard</h2>
            </div>
          </div>
        </div>
        
        <div className="feedback-button-container">
          <button 
            className="feedback-btn"
            onClick={() => setShowFeedbackForm(true)}
          >
            <FaCommentAlt /> Share Feedback
          </button>
        </div>
        
        <div className="package-card">
          <h3>Your Package</h3>
          {userPackage ? (
            <div className="package-content">
              <div className="package-info-item">
                <FaTicketAlt />
                <div>
                  <h4>Package Type</h4>
                  <p>{userPackage.type === 'free_swimming' ? 'Free Swimming' : userPackage.type}</p>
                  <p className="sessions-left">{userPackage.remaining_sessions} sessions left</p>
                </div>
              </div>
              <div className="package-info-item">
                <FaCalendarAlt />
                <div>
                  <h4>Valid Until</h4>
                  <p>{new Date(userPackage.expiry_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="package-purchase-needed">
              <p className="package-status-message">
                {pools && pools.length > 0 ? 
                  (new Date(pools[0].expiry_date) < new Date() ? 
                    "Your package has expired" : 
                    "You've used all your sessions"
                  ) : 
                  "You don't have an active package"
                }
              </p>
              <button 
                className="buy-package-btn"
                onClick={() => setShowPackagePurchase(true)}
              >
                Purchase New Package
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-main">
        <section className="pools-section">
          <h2>Swimming Pools</h2>
          <div className="pools-grid">
            {pools.map(pool => (
              <div 
                key={pool.id} 
                className={`pool-card ${selectedPool && selectedPool.id === pool.id ? 'selected' : ''}`}
                onClick={() => handlePoolSelect(pool)}
              >
                <h3>{pool.name}</h3>
                <div className="pool-info">
                  <div className="pool-stats">
                    <div className="pool-stat">
                      <FaGraduationCap />
                      <span>{pool.educationSessionCount} education sessions</span>
                    </div>
                    <div className="pool-stat">
                      <FaSwimmer />
                      <span>{pool.freeSwimmingSessionCount} free swimming sessions</span>
                    </div>
                  </div>
                  <button className="view-sessions-btn">View Sessions</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="sessions-section">
          <h2 className="section-header">Available Sessions</h2>
          
          {selectedPool ? (
            sessions.length > 0 ? (
              <div className="sessions-grid">
                {sessions.map(session => (
                  <div key={session.id} className={`session-card ${session.user_has_booked ? 'already-booked' : ''}`}>
                    <div className="session-header">
                      <h3>
                        {(() => {
                          const sessionDate = new Date(session.original_date || session.session_date);
                          
                          return sessionDate.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          });
                        })()}
                      </h3>
                      <span className="session-time">
                        {session.start_time} - {session.end_time}
                      </span>
                      
                      {session.user_has_booked && (
                        <span className="session-booked-badge">
                          <FaCheck /> Already Booked
                        </span>
                      )}
                    </div>
                    <div className="session-details">
                      <div className="session-date">
                        <FaCalendarAlt />
                        {new Date(session.session_date).toLocaleDateString()}
                      </div>
                      <div className="session-spots">
                        Available Spots: {session.available_spots}
                      </div>
                    </div>
                    <button 
                      onClick={() => bookSession(session.id)}
                      disabled={session.available_spots <= 0 || session.user_has_booked}
                      className={`book-btn ${session.user_has_booked ? 'already-booked-btn' : ''}`}
                    >
                      {session.user_has_booked 
                        ? 'Already Booked' 
                        : (session.available_spots <= 0 ? 'Session Full' : 'Book Session')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sessions-placeholder">
                <div className="subtle-loading">
                  <div className="dot-pulse"></div>
                  <p>There is no available session at the moment.</p>
                </div>
              </div>
            )
          ) : (
            <div className="select-pool-message">
              <p>Please select a pool to view available sessions</p>
            </div>
          )}
        </section>

        <section className="reservations-section">
          <h2>Your Reservations</h2>
          <div className="reservations-grid">
            {reservations.filter(r => r.status !== 'canceled' && r.status !== 'completed').length > 0 ? (
              reservations
                .filter(r => r.status !== 'canceled' && r.status !== 'completed')
                .map(reservation => (
                  <div key={reservation.id} className="reservation-card">
                    <div 
                      className="reservation-header"
                      onClick={() => toggleReservationDetails(reservation.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <h3>{reservation.poolName}</h3>
                      <span className={`reservation-type ${reservation.type}`}>
                        {reservation.type}
                      </span>
                    </div>
                    <div className="reservation-basic-info">
                      <div className="reservation-date">
                        <FaCalendarAlt />
                        <span>{new Date(reservation.session_date).toLocaleDateString()}</span>
                      </div>
                      <div className="reservation-time">
                        <FaClock />
                        <span>{reservation.start_time} - {reservation.end_time}</span>
                      </div>
                    </div>
                    {selectedReservation === reservation.id && (
                      <>
                        <div className="reservation-details">
                          <div className="reservation-info">
                            <div className="reservation-status">
                              <FaCheckCircle />
                              <span>Status: {reservation.status || 'Active'}</span>
                            </div>
                            <div className="reservation-location">
                              <FaMapMarkerAlt />
                              <span>Pool: {reservation.poolName}</span>
                            </div>
                            <div className="reservation-session">
                              <FaSwimmer />
                              <span>Session Type: {reservation.type}</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => cancelReservation(reservation.id)}
                          className="cancel-btn"
                        >
                          <FaTimes /> Cancel Reservation
                        </button>
                        <a 
                          href="/check-in"
                          className="check-in-btn"
                        >
                          <FaCheckCircle /> Go to Check-In
                        </a>
                      </>
                    )}
                  </div>
                ))
            ) : (
              <div className="no-reservations">
                <p>No active reservations found</p>
              </div>
            )}
          </div>
        </section>

        <section className="transaction-history-section">
          <h2>Transaction History</h2>
          <TransactionHistory history={transactionHistory} />
        </section>

        {verificationStatus === 'rejected' && (
          <section className="dashboard-section verification-section">
            <div className="section-header">
              <h2>
                <FaExclamationTriangle /> Verification Status
              </h2>
            </div>
            
            <div className="section-content verification-rejected">
              <div className="verification-alert">
                <h3>Your account verification was rejected</h3>
                <p className="rejection-reason">
                  <strong>Reason for Rejection:</strong> 
                  {verificationReason || 'No specific reason was provided by the administrator. Please update your information and documents for approval.'}
                </p>
                
                {userProfile.rejection_count >= MAX_REJECTIONS ? (
                  <div className="max-rejections-alert">
                    <FaExclamationTriangle />
                    <p>You have reached the maximum number of verification attempts. Please contact customer support for assistance.</p>
                  </div>
                ) : (
                  <>
                    {!isResubmitting ? (
                      <button 
                        className="primary-btn"
                        onClick={() => setIsResubmitting(true)}
                      >
                        Update and Resubmit Documents
                        {userProfile.rejection_count > 0 && 
                          <span className="attempt-counter">Attempt {userProfile.rejection_count + 1}/{MAX_REJECTIONS}</span>
                        }
                      </button>
                    ) : (
                      <form className="resubmit-form" onSubmit={handleResubmitVerification}>
                        <div className="form-heading">
                          <h4>Personal Information</h4>
                          <div className="required-field-note">* Required fields</div>
                        </div>
                        
                        <div className={`form-group ${formErrors.name ? 'has-error' : ''}`}>
                          <label htmlFor="name">Name *</label>
                          <input 
                            type="text" 
                            id="name" 
                            name="name"
                            value={userProfile.name}
                            onChange={handleInputChange}
                            className={formErrors.name ? 'input-error' : ''}
                          />
                          {formErrors.name && <div className="error-message-text">{formErrors.name}</div>}
                        </div>
                        
                        <div className={`form-group ${formErrors.surname ? 'has-error' : ''}`}>
                          <label htmlFor="surname">Surname *</label>
                          <input 
                            type="text" 
                            id="surname" 
                            name="surname"
                            value={userProfile.surname}
                            onChange={handleInputChange}
                            className={formErrors.surname ? 'input-error' : ''}
                          />
                          {formErrors.surname && <div className="error-message-text">{formErrors.surname}</div>}
                        </div>
                        
                        <div className={`form-group ${formErrors.dateOfBirth ? 'has-error' : ''}`}>
                          <label htmlFor="dateOfBirth">Date of Birth *</label>
                          <input 
                            type="date" 
                            id="dateOfBirth" 
                            name="dateOfBirth"
                            value={userProfile.dateOfBirth}
                            onChange={handleInputChange}
                            className={formErrors.dateOfBirth ? 'input-error' : ''}
                          />
                          {formErrors.dateOfBirth && <div className="error-message-text">{formErrors.dateOfBirth}</div>}
                        </div>
                        
                        <div className={`form-group ${formErrors.phone ? 'has-error' : ''}`}>
                          <label htmlFor="phone">Phone Number *</label>
                          <input 
                            type="tel" 
                            id="phone" 
                            name="phone"
                            value={userProfile.phone}
                            onChange={handleInputChange}
                            placeholder="Example: +90 555 123 4567"
                            className={formErrors.phone ? 'input-error' : ''}
                          />
                          {formErrors.phone && <div className="error-message-text">{formErrors.phone}</div>}
                        </div>
                        
                        <div className={`form-group ${formErrors.gender ? 'has-error' : ''}`}>
                          <label htmlFor="gender">Gender *</label>
                          <select
                            id="gender"
                            name="gender"
                            value={userProfile.gender || ''}
                            onChange={handleInputChange}
                            className={`form-select ${formErrors.gender ? 'input-error' : ''}`}
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                          {formErrors.gender && <div className="error-message-text">{formErrors.gender}</div>}
                        </div>
                        
                        <div className="form-heading">
                          <h4>Documents</h4>
                          <div className="document-hint">Please upload any documents mentioned in the rejection reason</div>
                        </div>
                        
                        <div className={`form-group ${formErrors.idCard ? 'has-error' : ''}`}>
                          <label htmlFor="idCard">ID Card (PDF/JPG/PNG)</label>
                          <input 
                            type="file" 
                            id="idCard" 
                            accept=".pdf,.jpg,.jpeg,.png" 
                            ref={idCardRef}
                            className={formErrors.idCard ? 'input-error' : ''}
                            onChange={() => {
                              if (formErrors.idCard) {
                                setFormErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.idCard;
                                  return newErrors;
                                });
                              }
                            }}
                          />
                          {formErrors.idCard && <div className="error-message-text">{formErrors.idCard}</div>}
                        </div>
                        
                        <div className={`form-group ${formErrors.profilePhoto ? 'has-error' : ''}`}>
                          <label htmlFor="profilePhoto">Profile Photo (JPG/PNG)</label>
                          <input 
                            type="file" 
                            id="profilePhoto" 
                            accept=".jpg,.jpeg,.png" 
                            ref={profilePhotoRef}
                            className={formErrors.profilePhoto ? 'input-error' : ''}
                            onChange={() => {
                              if (formErrors.profilePhoto) {
                                setFormErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.profilePhoto;
                                  return newErrors;
                                });
                              }
                            }}
                          />
                          {formErrors.profilePhoto && <div className="error-message-text">{formErrors.profilePhoto}</div>}
                        </div>
                        
                        {Object.keys(formErrors).length > 0 && (
                          <div className="validation-summary">
                            Please correct the errors above before submitting.
                          </div>
                        )}
                        
                        <div className="form-actions">
                          <button 
                            type="button" 
                            className="secondary-btn"
                            onClick={() => setIsResubmitting(false)}
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="primary-btn"
                          >
                            Resubmit Verification
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {showPackagePurchase && (
        <PackagePurchase 
          onPurchaseComplete={() => {
            setShowPackagePurchase(false);
            fetchUserData();
            fetchTransactionHistory();
          }} 
          onCancel={() => setShowPackagePurchase(false)}
        />
      )}

      {showFeedbackForm && (
        <div className="modal-overlay">
          <div className="feedback-modal-content">
            <div className="feedback-header">
              <div className="feedback-nav">
                <button
                  className={!showFeedbackHistory ? 'active' : ''}
                  onClick={() => setShowFeedbackHistory(false)}
                >
                  New Feedback
                </button>
                <button
                  className={showFeedbackHistory ? 'active' : ''}
                  onClick={() => setShowFeedbackHistory(true)}
                >
                  My Feedback
                </button>
              </div>
              <button className="close-btn" onClick={() => {
                setShowFeedbackForm(false);
                setShowFeedbackHistory(false);
                setFeedbackSubject('');
                setFeedbackMessage('');
                setFeedbackSubmitted(false);
              }}>
                Close
              </button>
            </div>

            {showFeedbackHistory ? (
              <div className="feedback-history">
                {feedbackHistory.length > 0 ? (
                  feedbackHistory.map((feedback) => (
                    <div key={feedback.id} className="feedback-item">
                      <div className="feedback-header">
                        <h4>{feedback.subject}</h4>
                        <span className="feedback-date">
                          {new Date(feedback.created_at).toTurkishTime()}
                        </span>
                      </div>
                      <p>{feedback.message}</p>
                      {feedback.response && (
                        <div className="feedback-response">
                          <h5>Response:</h5>
                          <p>{feedback.response}</p>
                          <span className="response-date">
                            {new Date(feedback.responded_at).toTurkishTime()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="no-feedback">
                    <p>You haven't submitted any feedback yet.</p>
                  </div>
                )}
              </div>
            ) : feedbackSubmitted ? (
              <div className="feedback-success">
                <FaCheckCircle />
                <p>Thank you for your feedback!</p>
              </div>
            ) : (
              <div className="feedback-form">
                <div className="form-group">
                  <label>Subject</label>
                  <input 
                    type="text" 
                    value={feedbackSubject}
                    onChange={(e) => setFeedbackSubject(e.target.value)}
                    placeholder="What's this about?"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Message</label>
                  <textarea 
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Tell us your thoughts, suggestions, or report issues..."
                    required
                  />
                </div>
                <button 
                  className="submit-feedback-btn"
                  onClick={submitFeedback}
                  disabled={!feedbackSubject.trim() || !feedbackMessage.trim()}
                >
                  Submit Feedback
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <div className="success-content">
            <FaCheckCircle />
            {successMessage}
          </div>
          <button 
            className="close-btn" 
            onClick={() => setSuccessMessage('')}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">
          <div className="error-content">
            {error}
          </div>
          <button 
            className="close-btn" 
            onClick={() => setError('')}
          >
            ×
          </button>
        </div>
      )}

      {healthStatusWarning && (
        <div className="health-status-warning">
          <div className="warning-content">
            <FaExclamationTriangle />
            {healthStatusWarning}
          </div>
          <button 
            className="close-btn" 
            onClick={() => setHealthStatusWarning('')}
          >
            ×
          </button>
        </div>
      )}

      {/* Check-in functionality has been moved to the dedicated Check-In page */}
    </div>
  );
};

export default MemberDashboard;