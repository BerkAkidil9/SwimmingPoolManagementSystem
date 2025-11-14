import React, { useState } from 'react';
import { FaCalendarAlt, FaTicketAlt, FaClock, FaMapMarkerAlt, FaSwimmer, FaMoneyBillWave, FaHistory } from 'react-icons/fa';
import './TransactionHistory.css';

const TransactionHistory = ({ history }) => {
  const [activeTab, setActiveTab] = useState('packages');
  const [showPackages, setShowPackages] = useState(true);
  const [showReservations, setShowReservations] = useState(true);

  // Format date in a user-friendly way in Turkish time (without the label)
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    // First create a UTC date object from the database timestamp
    const date = new Date(dateString);
    
    // Create a new date object with explicit Turkish time (+3 hours)
    const turkishDate = new Date(date);
    turkishDate.setTime(date.getTime() + (3 * 60 * 60 * 1000)); // Add 3 hours
    
    return turkishDate.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Calculate usage percentage for packages
  const calculateUsage = (total, remaining) => {
    const used = total - remaining;
    const percentage = Math.round((used / total) * 100);
    return percentage;
  };

  // Convert status code to user-friendly display text
  const getStatusDisplay = (status) => {
    switch(status) {
      case 'completed': return 'Checked In';
      case 'canceled': return 'Canceled';
      case 'missed': return 'No Show';
      case 'active': return 'Active';
      default: return 'Completed';
    }
  };

  // Handle tab click - now toggles visibility as well
  const handleTabClick = (tab) => {
    // If clicking the already active tab, just toggle its visibility
    if (activeTab === tab) {
      if (tab === 'packages') {
        setShowPackages(!showPackages);
      } else {
        setShowReservations(!showReservations);
      }
    } else {
      // If switching tabs, make the new tab active and visible
      setActiveTab(tab);
      if (tab === 'packages') {
        setShowPackages(true);
        // Optionally hide the other tab when switching
        // setShowReservations(false);
      } else {
        setShowReservations(true);
        // Optionally hide the other tab when switching
        // setShowPackages(false);
      }
    }
  };

  return (
    <div className="transaction-history">
      <div className="transaction-header">
        <h2><FaHistory /> Transaction History</h2>
        <div className="transaction-tabs">
          <button 
            className={activeTab === 'packages' ? 'active' : ''}
            onClick={() => handleTabClick('packages')}
          >
            <FaTicketAlt /> Packages
            <span className="toggle-indicator">{showPackages ? '▼' : '▶'}</span>
          </button>
          <button 
            className={activeTab === 'reservations' ? 'active' : ''}
            onClick={() => handleTabClick('reservations')}
          >
            <FaCalendarAlt /> Reservations
            <span className="toggle-indicator">{showReservations ? '▼' : '▶'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'packages' && showPackages && (
        <div className="packages-history">
          {history.packages && history.packages.length > 0 ? (
            history.packages.map((pkg) => (
              <div key={pkg.id} className="history-card package-history-card">
                <div className="history-card-header">
                  <div className="history-card-title">
                    <h3>{pkg.type.replace('_', ' ').toUpperCase()} Package</h3>
                    <span className={`status-badge ${pkg.status}`}>
                      {pkg.status}
                    </span>
                  </div>
                  <div className="history-card-date">
                    <FaCalendarAlt />
                    <span>Purchased: {formatDate(pkg.purchase_date)}</span>
                  </div>
                </div>
                
                <div className="history-card-details">
                  <div className="package-info-row">
                    <div className="package-info-item">
                      <FaTicketAlt />
                      <div>
                        <h4>Total Sessions</h4>
                        <p>{pkg.total_sessions}</p>
                      </div>
                    </div>
                    <div className="package-info-item">
                      <FaTicketAlt />
                      <div>
                        <h4>Remaining</h4>
                        <p>{pkg.remaining_sessions}</p>
                      </div>
                    </div>
                    <div className="package-info-item">
                      <FaMoneyBillWave />
                      <div>
                        <h4>Price</h4>
                        <p>${pkg.price}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="package-usage">
                    <h4>Usage</h4>
                    <div className="usage-bar">
                      <div 
                        className="usage-progress" 
                        style={{ width: `${calculateUsage(pkg.total_sessions, pkg.remaining_sessions)}%` }}
                      >
                      </div>
                      <span className="usage-percentage">
                        {calculateUsage(pkg.total_sessions, pkg.remaining_sessions)}%
                      </span>
                    </div>
                    <p>{pkg.total_sessions - pkg.remaining_sessions} of {pkg.total_sessions} sessions used</p>
                  </div>
                  
                  <div className="package-validity">
                    <div className="validity-item">
                      <FaCalendarAlt />
                      <div>
                        <h4>Valid Until</h4>
                        <p>{formatDate(pkg.expiry_date).split(',')[0]}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-history">
              <p>No package history found.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reservations' && showReservations && (
        <div className="reservations-history">
          {history.reservations && history.reservations.length > 0 ? (
            history.reservations.map((reservation) => (
              <div key={reservation.id} className="history-card reservation-history-card">
                <div className="history-card-header">
                  <div className="history-card-title">
                    <h3>{reservation.poolName}</h3>
                    <div className="reservation-badges">
                      <span className={`type-badge ${reservation.type}`}>
                        {reservation.type.replace('_', ' ')}
                      </span>
                      <span className={`status-badge ${reservation.status || 'completed'}`}>
                        {getStatusDisplay(reservation.status)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="history-card-details">
                  <div className="reservation-info-row">
                    <div className="reservation-info-item">
                      <FaCalendarAlt />
                      <div>
                        <h4>Session Date</h4>
                        <p>{new Date(reservation.session_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          timeZone: 'Europe/Istanbul'
                        })}</p>
                      </div>
                    </div>
                    <div className="reservation-info-item">
                      <FaClock />
                      <div>
                        <h4>Time</h4>
                        <p>{reservation.start_time} - {reservation.end_time}</p>
                      </div>
                    </div>
                    <div className="reservation-info-item">
                      <FaMapMarkerAlt />
                      <div>
                        <h4>Location</h4>
                        <p>{reservation.poolName}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="reservation-history-meta">
                    <div className="meta-item">
                      <FaHistory />
                      <span>Booked on: {formatDate(reservation.reservation_date)}</span>
                    </div>
                    <div className="meta-item">
                      <FaSwimmer />
                      <span>Session Type: {reservation.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-history">
              <p>No reservation history found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory; 