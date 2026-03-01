import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCheckCircle, FaCheck, FaExclamationTriangle, FaInfoCircle, FaSwimmer, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaEye, FaQrcode } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import './CheckInPage.css';
import Navbar from './Navbar/Navbar';

const CheckInPage = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkInResult, setCheckInResult] = useState(null);
  const [showCheckInInfoModal, setShowCheckInInfoModal] = useState(false);
  const [checkInInfoMessage, setCheckInInfoMessage] = useState('');
  const [checkInInfoStatus, setCheckInInfoStatus] = useState('');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [checkedInReservations, setCheckedInReservations] = useState([]);
  const [selectedQRCode, setSelectedQRCode] = useState(null);
  const [userData, setUserData] = useState(null);
  // User ID is primarily obtained from session storage

  // Generate a hash for verification (in a real system this would be cryptographically secure)
  const generateVerificationHash = (id, timestamp) => {
    try {
      return btoa(`${id}-${timestamp}-POOL-VERIFY`).substring(0, 12);
    } catch (e) {
      // Fallback if btoa fails
      return `HASH-${id}-${timestamp.toString().substring(7)}`;
    }
  };

  useEffect(() => {
    // Set default locale for dates
    if (Intl && Intl.DateTimeFormat) {
      Intl.DateTimeFormat().resolvedOptions().timeZone = 'Europe/Istanbul';
    }
    
    // Retrieve user ID from session storage
    try {
      const userSession = sessionStorage.getItem('user');
      if (userSession) {
        const user = JSON.parse(userSession);
        if (user.id) {
          // Store user ID in localStorage for persistence
          localStorage.setItem('membershipId', user.id.toString());
        }
      }
    } catch (err) {
      console.error('Error retrieving user session:', err);
    }
    
    fetchReservations();
    fetchUserData();
  }, []);
  
  const fetchUserData = async () => {
    try {
      const response = await axios.get('/api/member/profile');
      setUserData(response.data);
      
      // Store API response for use in QR code generation
      
      // Store important user info in localStorage for persistency
      if (response.data?.name) {
        const fullName = response.data.surname 
          ? `${response.data.name} ${response.data.surname}` 
          : response.data.name;
            
        localStorage.setItem('memberName', fullName);
        localStorage.setItem('memberFirstName', response.data.name);
        localStorage.setItem('memberSurname', response.data.surname || '');
      } else if (response.data?.fullName) {
        localStorage.setItem('memberName', response.data.fullName);
      }
      
      // Store all potential user IDs (whichever one exists)
      let foundUserId = null;
      if (response.data?.id) {
        foundUserId = response.data.id.toString();
      } else if (response.data?.userId) {
        foundUserId = response.data.userId.toString();
      } else if (response.data?.user_id) {
        foundUserId = response.data.user_id.toString();
      }
      
      if (foundUserId) {
        localStorage.setItem('membershipId', foundUserId);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      
      // Attempt to get user ID from session storage if available
      const userSession = sessionStorage.getItem('user');
      if (userSession) {
        try {
          const user = JSON.parse(userSession);
          if (user.id) {
            localStorage.setItem('membershipId', user.id.toString());
          }
          if (user.name) {
            const fullName = user.surname 
              ? `${user.name} ${user.surname}` 
              : user.name;
                
            localStorage.setItem('memberName', fullName);
            localStorage.setItem('memberFirstName', user.name);
            localStorage.setItem('memberSurname', user.surname || '');
          }
        } catch (parseErr) {
          console.error('Error parsing user session:', parseErr);
        }
      }
    }
  };

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/member/reservations');
      const allReservations = response.data || [];
      
      // Filter only active reservations that are today or in the future (for upcoming list)
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const activeReservations = allReservations.filter(r => {
        const reservationDate = new Date(r.session_date);
        return r.status !== 'canceled' && 
               r.status !== 'completed' && 
               reservationDate >= today;
      });
      
      // Checked-in reservations from API (cross-device - works on any PC/phone)
      const completedReservations = allReservations
        .filter(r => r.status === 'completed')
        .map(r => ({
          ...r,
          checkInCode: r.check_in_code || r.checkInCode,
          checkInTime: r.checked_in_at 
            ? new Date(r.checked_in_at).toLocaleTimeString() 
            : (r.checkInTime || ''),
          status: 'checked-in'
        }));
      
      setReservations(activeReservations);
      setCheckedInReservations(completedReservations);
      setError('');
    } catch (err) {
      setError('Failed to fetch reservations: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInClick = async (reservation) => {
    try {
      setLoading(true);
      
      // Check if the session is today
      const sessionDate = new Date(reservation.session_date);
      const today = new Date();
      
      // Check if the current time is within the allowed check-in window (1 day before to 15 minutes after start time)
      const sessionTime = reservation.start_time.split(':');
      const sessionHour = parseInt(sessionTime[0]);
      const sessionMinute = parseInt(sessionTime[1]);
      
      const sessionDateTime = new Date(sessionDate);
      sessionDateTime.setHours(sessionHour, sessionMinute);
      
      const oneDayBefore = new Date(sessionDateTime.getTime() - 24 * 60 * 60 * 1000);
      
      const fifteenMinutesAfter = new Date(sessionDateTime);
      fifteenMinutesAfter.setMinutes(fifteenMinutesAfter.getMinutes() + 15);
      
      if (today < oneDayBefore) {
        setCheckInInfoStatus('error');
        setCheckInInfoMessage('Check-in is only available from 1 day before your session starts.');
        setShowCheckInInfoModal(true);
        setLoading(false);
        return;
      }
      
      if (today > fifteenMinutesAfter) {
        setCheckInInfoStatus('error');
        setCheckInInfoMessage('Check-in window has closed. You can only check in up to 15 minutes after your session starts.');
        setShowCheckInInfoModal(true);
        setLoading(false);
        return;
      }
      
      // Check-in is performed by staff at the pool, but this is a simulation for testing
      const response = await axios.post('/api/member/check-in', { reservationId: reservation.id });
      
      if (response.data.success) {
        const checkInCode = response.data.checkInCode;
        const checkedInAt = response.data.checkedInAt || new Date().toISOString();
        
        // Get actual user ID from multiple sources
        const membershipId = 
          userData?.id?.toString() || 
          userData?.userId?.toString() || 
          userData?.user_id?.toString() || 
          localStorage.getItem('membershipId') || 
          reservation.user_id?.toString() || 
          reservation.userId?.toString() ||  
          reservation.memberId?.toString();
        
        if (membershipId) localStorage.setItem('membershipId', membershipId);
        
        const newCheckInResult = { 
          ...reservation,
          checkInTime: new Date(checkedInAt).toLocaleTimeString(),
          status: 'checked-in',
          checkInCode,
          check_in_code: checkInCode,
          checked_in_at: checkedInAt,
          memberName: userData?.name || userData?.fullName || localStorage.getItem('memberName') || 'Member',
          membershipId: membershipId
        };
        
        setCheckInResult(newCheckInResult);
        
        // Add to checked-in list (from API - works cross-device)
        setCheckedInReservations(prev => {
          const existing = prev.findIndex(ci => ci.id === reservation.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newCheckInResult;
            return updated;
          }
          return [...prev, newCheckInResult];
        });
        
        setCheckInInfoStatus('success');
        setCheckInInfoMessage('Check-in successful! Please show this confirmation to the staff.');
        setShowCheckInInfoModal(true);
        
        // Refresh reservations to update the status
        fetchReservations();
      } else {
        setCheckInInfoStatus('error');
        setCheckInInfoMessage(response.data.message || 'Failed to check in.');
        setShowCheckInInfoModal(true);
      }
    } catch (error) {
      setCheckInInfoStatus('error');
      const msg = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || 'An error occurred during check-in.';
      setCheckInInfoMessage(msg);
      setShowCheckInInfoModal(true);
    } finally {
      setLoading(false);
    }
  };

  const closeCheckInInfoModal = () => {
    setShowCheckInInfoModal(false);
    // Keep the check-in result even after closing the modal
  };
  
  const handleViewQRCode = (reservationId) => {
    const reservation = checkedInReservations.find(r => r.id === reservationId);
    if (reservation) {
      setSelectedQRCode(reservation);
    }
  };
  
  const closeQRCodeView = () => {
    setSelectedQRCode(null);
  };
  
  // Helper function to get user ID from various sources, prioritizing session storage
  const getUserId = () => {
    try {
      // First try session storage (most reliable source)
      const userSession = sessionStorage.getItem('user');
      if (userSession) {
        const user = JSON.parse(userSession);
        if (user.id) return user.id.toString();
      }
      
      // Then try other sources
      return userData?.id?.toString() || 
             localStorage.getItem('membershipId') || 
             '';
    } catch (err) {
      console.error('Error getting user ID:', err);
      return '';
    }
  };

  return (
    <div className="check-in-page">
      <Navbar />
      <div className="check-in-container">
        <header className="check-in-header">
          <div className="header-title">
            <h1>Pool Check-In</h1>
            <FaQrcode size={42} />
          </div>
          
          <p className="check-in-instructions">
            Check in for your swimming session by selecting your reservation below. 
            You can check in from 1 day before your session starts.
          </p>
        </header>

        <section className="upcoming-reservations">
          <h2>Your Upcoming Reservations</h2>
          
          {loading ? (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Loading your reservations...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <FaExclamationTriangle />
              <p>{error}</p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="no-reservations">
              <FaInfoCircle />
              <p>You don't have any upcoming reservations.</p>
              <a href="/dashboard" className="link-button">Go to Dashboard</a>
            </div>
          ) : (
            <div className="reservations-list">
              {reservations.map(reservation => {
                const today = new Date();
                const sessionDate = new Date(reservation.session_date);
                const isToday = sessionDate.toDateString() === today.toDateString();
                
                // Parse session time to create Date objects
                const startTimeParts = reservation.start_time.split(':');
                const sessionDateTime = new Date(sessionDate);
                sessionDateTime.setHours(
                  parseInt(startTimeParts[0]), 
                  parseInt(startTimeParts[1])
                );
                
                // Calculate if check-in is available (1 day before to 15 minutes after session start)
                const checkInOpenTime = new Date(sessionDateTime.getTime() - 24 * 60 * 60 * 1000);
                const checkInCloseTime = new Date(sessionDateTime);
                checkInCloseTime.setMinutes(checkInCloseTime.getMinutes() + 15);
                
                const isCheckInAvailable = today >= checkInOpenTime && today <= checkInCloseTime;
                
                const isCheckedIn = reservation.status === 'checked-in';

                return (
                  <div 
                    key={reservation.id} 
                    className={`reservation-card ${isToday ? 'today' : ''} ${isCheckedIn ? 'checked-in' : ''}`}
                    onClick={() => setSelectedReservation(selectedReservation === reservation.id ? null : reservation.id)}
                  >
                    <div className="reservation-basic-info">
                      <div className="pool-name">
                        <h3>{reservation.poolName}</h3>
                        <span className={`reservation-type ${reservation.type}`}>
                          {reservation.type.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="reservation-details">
                        <div className="detail-item">
                          <FaCalendarAlt />
                          <span>{sessionDate.toLocaleDateString()}</span>
                        </div>
                        <div className="detail-item">
                          <FaClock />
                          <span>{reservation.start_time} - {reservation.end_time}</span>
                        </div>
                        <div className="detail-item">
                          <FaMapMarkerAlt />
                          <span>Pool Lane: {reservation.lane || 'To be assigned'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {isCheckedIn && (
                      <div className="checked-in-badge">
                        <FaCheckCircle />
                        <span>Checked In</span>
                      </div>
                    )}
                    
                    <div className="check-in-action">
                      {isCheckedIn ? (
                        <button 
                          className="view-qr-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewQRCode(reservation.id);
                          }}
                        >
                          <FaEye /> View QR Code
                        </button>
                      ) : (
                        <button 
                          className={`check-in-button ${!isCheckInAvailable || isCheckedIn ? 'disabled' : ''}`}
                          disabled={!isCheckInAvailable || isCheckedIn || loading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckInClick(reservation);
                          }}
                        >
                          {loading ? (
                            <span>Processing...</span>
                          ) : isCheckedIn ? (
                            <><FaCheckCircle /> Checked In</>
                          ) : isCheckInAvailable ? (
                            <><FaCheckCircle /> Check In</>
                          ) : isToday ? (
                            <><FaClock /> Check-in Opens Soon</>
                          ) : (
                            <><FaCalendarAlt /> Future Reservation</>
                          )}
                        </button>
                      )}
                      
                      {!isCheckInAvailable && isToday && (
                        <div className="check-in-tooltip">
                          <FaInfoCircle />
                          <span>Check-in will be available from 1 day before your session</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        
        <section className="check-in-info">
          <h2>Check-In Process</h2>
          <div className="info-cards">
            <div className="info-card">
              <div className="card-icon"><FaClock /></div>
              <h3>Timing</h3>
              <p>Check-in opens 1 day before your scheduled session and closes 15 minutes after the session starts.</p>
            </div>
            <div className="info-card">
              <div className="card-icon"><FaSwimmer /></div>
              <h3>At the Pool</h3>
              <p>Show your digital check-in confirmation to the pool staff upon arrival.</p>
            </div>
            <div className="info-card">
              <div className="card-icon"><FaInfoCircle /></div>
              <h3>Important</h3>
              <p>If you miss the check-in window, your reservation may be given to standby swimmers.</p>
            </div>
          </div>
        </section>
      </div>
      
      {/* Checked-In Reservations Section */}
      <section className="checked-in-section">
        <h2>Your Checked-In Reservations</h2>
        {checkedInReservations.length > 0 ? (
          <div className="checked-in-reservations">
            {checkedInReservations.map(reservation => (
              <div key={reservation.id} className="checked-in-card">
                <div className="checked-in-info">
                  <div className="pool-name">
                    <h3>{reservation.poolName}</h3>
                    <span className={`reservation-type ${reservation.type}`}>
                      {reservation.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="reservation-details">
                    <div className="detail-item">
                      <FaCalendarAlt />
                      <span>{new Date(reservation.session_date).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <FaClock />
                      <span>{reservation.start_time} - {reservation.end_time}</span>
                    </div>
                    <div className="detail-item">
                      <FaMapMarkerAlt />
                      <span>Pool Lane: {reservation.lane || 'To be assigned'}</span>
                    </div>
                    <div className="detail-item">
                      <FaCheckCircle />
                      <span>Checked In at: {reservation.checkInTime}</span>
                    </div>
                  </div>
                </div>
                <button 
                  className="view-qr-button"
                  onClick={() => handleViewQRCode(reservation.id)}
                >
                  <FaEye /> View QR Code
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-checked-in">
            <FaInfoCircle />
            <p>You haven't checked in to any reservations yet.</p>
          </div>
        )}
      </section>

      {/* QR Code View Modal */}
      {selectedQRCode && (
        <div className="check-in-modal-overlay">
          <div className="check-in-modal success">
            <div className="modal-header">
              <button className="close-button" onClick={closeQRCodeView}>×</button>
              <div className="modal-header-content">
                <h3>Check-In Confirmation</h3>
                <div className="custom-checkmark">
                  <div className="checkmark-circle"></div>
                  <div className="checkmark-stem"></div>
                  <div className="checkmark-kick"></div>
                </div>
              </div>
            </div>
            <div className="modal-content">
              <p>Show this confirmation to the pool staff.</p>
              
              <div className="check-in-confirmation">
                <div className="confirmation-details">
                  <div className="detail-row">
                    <strong>Pool:</strong> {selectedQRCode.poolName}
                  </div>
                  <div className="detail-row">
                    <strong>Date:</strong> {new Date(selectedQRCode.session_date).toLocaleDateString()}
                  </div>
                  <div className="detail-row">
                    <strong>Time:</strong> {selectedQRCode.start_time} - {selectedQRCode.end_time}
                  </div>
                  <div className="detail-row">
                    <strong>Check-In Time:</strong> {selectedQRCode.checkInTime}
                  </div>
                </div>
                
                <div className="qr-code-container">
                  <div className="real-qr-code">
                    <QRCodeSVG 
                      value={JSON.stringify({
                        id: selectedQRCode.id || '',
                        name: selectedQRCode.memberName || localStorage.getItem('memberName') || 'Member',
                        membershipId: getUserId(),
                        poolName: selectedQRCode.poolName || '',
                        date: selectedQRCode.session_date ? new Date(selectedQRCode.session_date).toLocaleDateString() : '',
                        time: selectedQRCode.start_time ? `${selectedQRCode.start_time} - ${selectedQRCode.end_time}` : '',
                        checkInCode: selectedQRCode.checkInCode || selectedQRCode.check_in_code || ''
                      })}
                      size={200}
                      level={"M"}
                      includeMargin={true}
                      bgColor={"#ffffff"}
                      fgColor={"#000000"}
                    />
                  </div>
                  <p>Show this QR code to pool staff</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="close-modal-button" onClick={closeQRCodeView}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Check-in Info Modal */}
      {showCheckInInfoModal && (
        <div className="check-in-modal-overlay">
          <div className={`check-in-modal ${checkInInfoStatus}`}>
            <div className="modal-header">
              <button className="close-button" onClick={closeCheckInInfoModal}>×</button>
              <div className="modal-header-content">
                <h3>{checkInInfoStatus === 'success' ? 'Check-In Successful' : 'Check-In Failed'}</h3>
                {checkInInfoStatus === 'success' ? (
                  <div className="custom-checkmark">
                    <div className="checkmark-circle"></div>
                    <div className="checkmark-stem"></div>
                    <div className="checkmark-kick"></div>
                  </div>
                ) : (
                  <FaExclamationTriangle className="error-icon" />
                )}
              </div>
            </div>
            <div className="modal-content">
              <p>{checkInInfoMessage}</p>
              
              {checkInInfoStatus === 'success' && checkInResult && (
                <div className="check-in-confirmation">
                  <div className="confirmation-details">
                    <div className="detail-row">
                      <strong>Pool:</strong> {checkInResult.poolName}
                    </div>
                    <div className="detail-row">
                      <strong>Date:</strong> {new Date(checkInResult.session_date).toLocaleDateString()}
                    </div>
                    <div className="detail-row">
                      <strong>Time:</strong> {checkInResult.start_time} - {checkInResult.end_time}
                    </div>
                    <div className="detail-row">
                      <strong>Check-In Time:</strong> {checkInResult.checkInTime}
                    </div>
                  </div>
                  
                  <div className="qr-code-container">
                    <div className="real-qr-code">
                      <QRCodeSVG 
                        value={JSON.stringify({
                          id: checkInResult.id || '',
                          name: checkInResult.memberName || localStorage.getItem('memberName') || 'Member',
                          membershipId: getUserId(),
                          poolName: checkInResult.poolName || '',
                          date: checkInResult.session_date ? new Date(checkInResult.session_date).toLocaleDateString() : '',
                          time: checkInResult.start_time ? `${checkInResult.start_time} - ${checkInResult.end_time}` : '',
                          checkInCode: checkInResult.checkInCode || checkInResult.check_in_code || ''
                        })}
                        size={200}
                        level={"M"}
                        includeMargin={true}
                        bgColor={"#ffffff"}
                        fgColor={"#000000"}
                      />
                    </div>
                    <p>Show this QR code to pool staff</p>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="close-modal-button" onClick={closeCheckInInfoModal}>
                {checkInInfoStatus === 'success' ? 'Done' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInPage;
