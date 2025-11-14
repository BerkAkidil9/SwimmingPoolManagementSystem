import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaCreditCard, FaHistory, FaSwimmer, FaInfoCircle, FaTimes, FaChevronDown, FaChevronUp, FaSort, FaSortUp, FaSortDown, FaWallet } from 'react-icons/fa';
import Navbar from '../components/Navbar/Navbar';
import PaymentMethods from '../components/PaymentMethods';
import './Billing.css';

const Billing = () => {
  const [activeTab, setActiveTab] = useState('package');
  const [userPackage, setUserPackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactionHistory, setTransactionHistory] = useState({ packages: [], reservations: [] });
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // State for collapsible sections
  const [packagesOpen, setPackagesOpen] = useState(true);
  const [reservationsOpen, setReservationsOpen] = useState(true);
  
  // State for sorting
  const [packageSort, setPackageSort] = useState({ field: 'created_at', direction: 'desc' });
  const [reservationSort, setReservationSort] = useState({ field: 'date', direction: 'desc' });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch user's package details
        const packageResponse = await axios.get('/api/member/package', { withCredentials: true });
        if (packageResponse.data) {
          setUserPackage({
            type: packageResponse.data.type,
            remainingSessions: packageResponse.data.remaining_sessions,
            startDate: packageResponse.data.created_at,
            endDate: packageResponse.data.expiry_date,
            isActive: new Date(packageResponse.data.expiry_date) >= new Date() && packageResponse.data.remaining_sessions > 0
          });
        }
        
        // Fetch transaction history
        const historyResponse = await axios.get('/api/member/history', { withCredentials: true });
        
        // Log the full response for debugging
        console.log('Full transaction history:', JSON.stringify(historyResponse.data, null, 2));
        
        if (historyResponse.data && historyResponse.data.reservations && historyResponse.data.reservations.length > 0) {
          console.log('First reservation data:', historyResponse.data.reservations[0]);
          
          // The API already returns poolName, type, session_date, start_time, and end_time
          // No need to make additional API calls
        }
        
        if (historyResponse.data) {
          setTransactionHistory(historyResponse.data);
        }
        
        setLoading(false);
        setError(null);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
        setError('Failed to load billing data. Please try again later.');
      }
    };
    
    fetchUserData();
  }, []);
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
  };
  
  // Sorting function for packages
  const handlePackageSort = (field) => {
    setPackageSort(prevSort => ({
      field,
      direction: prevSort.field === field && prevSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Sorting function for reservations
  const handleReservationSort = (field) => {
    setReservationSort(prevSort => ({
      field,
      direction: prevSort.field === field && prevSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Get sorted packages
  const getSortedPackages = () => {
    if (!transactionHistory.packages || !transactionHistory.packages.length) {
      return [];
    }
    
    return [...transactionHistory.packages].sort((a, b) => {
      if (packageSort.field === 'type') {
        return packageSort.direction === 'asc' 
          ? a.type.localeCompare(b.type)
          : b.type.localeCompare(a.type);
      } else if (packageSort.field === 'created_at' || packageSort.field === 'expiry_date') {
        const dateA = new Date(a[packageSort.field]);
        const dateB = new Date(b[packageSort.field]);
        return packageSort.direction === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (packageSort.field === 'total_sessions') {
        return packageSort.direction === 'asc' 
          ? a.total_sessions - b.total_sessions
          : b.total_sessions - a.total_sessions;
      } else if (packageSort.field === 'price') {
        return packageSort.direction === 'asc' 
          ? a.price - b.price
          : b.price - a.price;
      } else if (packageSort.field === 'status') {
        const statusA = a.status || 'expired';
        const statusB = b.status || 'expired';
        return packageSort.direction === 'asc' 
          ? statusA.localeCompare(statusB)
          : statusB.localeCompare(statusA);
      } else if (packageSort.field === 'remaining_sessions') {
        return packageSort.direction === 'asc' 
          ? a.remaining_sessions - b.remaining_sessions
          : b.remaining_sessions - a.remaining_sessions;
      }
      return 0;
    });
  };
  
  // Get sorted reservations
  const getSortedReservations = () => {
    if (!transactionHistory.reservations || !transactionHistory.reservations.length) {
      return [];
    }
    
    return [...transactionHistory.reservations].sort((a, b) => {
      if (reservationSort.field === 'pool_name') {
        const poolA = a.poolName || '';
        const poolB = b.poolName || '';
        return reservationSort.direction === 'asc' 
          ? poolA.localeCompare(poolB)
          : poolB.localeCompare(poolA);
      } else if (reservationSort.field === 'session_type') {
        const typeA = a.type || '';
        const typeB = b.type || '';
        return reservationSort.direction === 'asc' 
          ? typeA.localeCompare(typeB)
          : typeB.localeCompare(typeA);
      } else if (reservationSort.field === 'date') {
        const dateA = new Date(a.session_date || a.date || '');
        const dateB = new Date(b.session_date || b.date || '');
        return reservationSort.direction === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (reservationSort.field === 'time') {
        const timeA = a.start_time || a.time || '';
        const timeB = b.start_time || b.time || '';
        return reservationSort.direction === 'asc' 
          ? timeA.localeCompare(timeB)
          : timeB.localeCompare(timeA);
      } else if (reservationSort.field === 'status') {
        const statusA = a.status || '';
        const statusB = b.status || '';
        return reservationSort.direction === 'asc' 
          ? statusA.localeCompare(statusB)
          : statusB.localeCompare(statusA);
      }
      return 0;
    });
  };

  // Sort icon component
  const SortIcon = ({ field, currentSort }) => {
    if (currentSort.field !== field) {
      return <FaSort className="sort-icon" />;
    }
    return currentSort.direction === 'asc' ? <FaSortUp className="sort-icon" /> : <FaSortDown className="sort-icon" />;
  };

  // Helper function to map status values to CSS classes
  const getStatusClass = (status) => {
    if (!status) return '';
    
    // Log the status to see the exact value
    console.log("Reservation status:", status);
    
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'active') return 'active';
    if (statusLower === 'completed') return 'completed';
    if (statusLower === 'canceled' || statusLower === 'cancelled') return 'cancelled'; // Handle both spellings
    if (statusLower === 'missed') return 'missed';
    
    return statusLower; // fallback to the original status
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="billing-container loading">
          <div className="loading-spinner"></div>
          <p>Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="billing-container">
        <div className="page-header">
          <h1>Billing & Payments</h1>
          <button className="close-button" onClick={() => navigate('/dashboard')}>
            <FaTimes />
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            <FaInfoCircle /> {error}
          </div>
        )}
        
        <div className="billing-tabs">
          <button 
            className={`tab-button ${activeTab === 'package' ? 'active' : ''}`}
            onClick={() => handleTabChange('package')}
          >
            <FaSwimmer /> Current Package
          </button>
          <button 
            className={`tab-button ${activeTab === 'purchase-history' ? 'active' : ''}`}
            onClick={() => handleTabChange('purchase-history')}
          >
            <FaHistory /> Purchase History
          </button>
          <button 
            className={`tab-button ${activeTab === 'payment-methods' ? 'active' : ''}`}
            onClick={() => handleTabChange('payment-methods')}
          >
            <FaWallet /> Payment Methods
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'package' && (
            <div className="package-section">
              {userPackage ? (
                <div className="current-package">
                  <h2>{userPackage.type === 'education' ? 'Swimming Education' : 'Free Swimming'} Package</h2>
                  <div className="package-details">
                    <div className="package-info">
                      <p><strong>Type:</strong> {userPackage.type.replace('_', ' ').charAt(0).toUpperCase() + userPackage.type.replace('_', ' ').slice(1)}</p>
                      <p><strong>Start Date:</strong> {formatDate(userPackage.startDate)}</p>
                      <p><strong>Expiry Date:</strong> {formatDate(userPackage.endDate)}</p>
                      <p><strong>Remaining Sessions:</strong> {userPackage.remainingSessions}</p>
                    </div>
                    <div className="package-status">
                      <div className={`status-indicator ${userPackage.isActive ? 'active' : 'inactive'}`}>
                        <span>{userPackage.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-package">
                  <h2>No active package</h2>
                  <p>You don't have any active swimming package. Visit the center to purchase a new package.</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'purchase-history' && (
            <div className="purchase-history-section">
              {/* Package History Section - Collapsible */}
              <div className="history-section">
                <div 
                  className="history-section-header" 
                  onClick={() => setPackagesOpen(!packagesOpen)}
                >
                  <h2>Package History</h2>
                  <button className="toggle-button">
                    {packagesOpen ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                </div>
                
                {packagesOpen && (
                  transactionHistory.packages && transactionHistory.packages.length > 0 ? (
                    <div className="history-table-container">
                      <table className="history-table">
                        <thead>
                          <tr>
                            <th onClick={() => handlePackageSort('type')}>
                              Package Type <SortIcon field="type" currentSort={packageSort} />
                            </th>
                            <th onClick={() => handlePackageSort('created_at')}>
                              Purchase Date <SortIcon field="created_at" currentSort={packageSort} />
                            </th>
                            <th onClick={() => handlePackageSort('expiry_date')}>
                              Expiry Date <SortIcon field="expiry_date" currentSort={packageSort} />
                            </th>
                            <th onClick={() => handlePackageSort('total_sessions')}>
                              Total Sessions <SortIcon field="total_sessions" currentSort={packageSort} />
                            </th>
                            <th onClick={() => handlePackageSort('remaining_sessions')}>
                              Remaining Sessions <SortIcon field="remaining_sessions" currentSort={packageSort} />
                            </th>
                            <th onClick={() => handlePackageSort('price')}>
                              Price <SortIcon field="price" currentSort={packageSort} />
                            </th>
                            <th onClick={() => handlePackageSort('status')}>
                              Status <SortIcon field="status" currentSort={packageSort} />
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedPackages().map((pkg, index) => (
                            <tr key={index}>
                              <td>{pkg.type === 'education' ? 'Swimming Education' : 'Free Swimming'}</td>
                              <td>{formatDate(pkg.created_at)}</td>
                              <td>{formatDate(pkg.expiry_date)}</td>
                              <td>{pkg.total_sessions || 'N/A'}</td>
                              <td>{pkg.remaining_sessions || '0'}</td>
                              <td>${typeof pkg.price === 'number' ? pkg.price.toFixed(2) : parseFloat(pkg.price).toFixed(2)}</td>
                              <td>
                                <span className={`status-pill ${(new Date(pkg.expiry_date) >= new Date() && parseInt(pkg.remaining_sessions) > 0) ? 'active' : 'expired'}`}>
                                  {(new Date(pkg.expiry_date) >= new Date() && parseInt(pkg.remaining_sessions) > 0) ? 'Active' : 'Expired'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="no-data-message">No package history available.</p>
                  )
                )}
              </div>
              
              {/* Reservation History Section - Collapsible */}
              <div className="history-section">
                <div 
                  className="history-section-header" 
                  onClick={() => setReservationsOpen(!reservationsOpen)}
                >
                  <h2>Reservation History</h2>
                  <button className="toggle-button">
                    {reservationsOpen ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                </div>
                
                {reservationsOpen && (
                  transactionHistory.reservations && transactionHistory.reservations.length > 0 ? (
                    <div className="history-table-container">
                      <table className="history-table">
                        <thead>
                          <tr>
                            <th onClick={() => handleReservationSort('pool_name')}>
                              Pool <SortIcon field="pool_name" currentSort={reservationSort} />
                            </th>
                            <th onClick={() => handleReservationSort('session_type')}>
                              Session Type <SortIcon field="session_type" currentSort={reservationSort} />
                            </th>
                            <th onClick={() => handleReservationSort('date')}>
                              Date <SortIcon field="date" currentSort={reservationSort} />
                            </th>
                            <th onClick={() => handleReservationSort('time')}>
                              Time <SortIcon field="time" currentSort={reservationSort} />
                            </th>
                            <th onClick={() => handleReservationSort('status')}>
                              Status <SortIcon field="status" currentSort={reservationSort} />
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedReservations().map((reservation, index) => {
                            // Backend already provides poolName, use that directly
                            const displayPoolName = reservation.poolName || 'Swimming Pool';
                            
                            // Log each reservation as we render it
                            console.log('Rendering reservation:', reservation);
                            
                            return (
                              <tr key={index}>
                                <td>{displayPoolName}</td>
                                <td>{reservation.type === 'education' ? 'Swimming Education' : 'Free Swimming'}</td>
                                <td>{formatDate(reservation.session_date)}</td>
                                <td>{reservation.start_time ? `${reservation.start_time} - ${reservation.end_time || ''}` : formatTime(reservation.time)}</td>
                                <td>
                                  <span className={`status-pill ${getStatusClass(reservation.status)}`}>
                                    {reservation.status || 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="no-data-message">No reservation history available.</p>
                  )
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'payment-methods' && (
            <div className="payment-methods-section">
              <PaymentMethods />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;
