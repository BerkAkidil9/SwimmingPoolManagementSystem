import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SessionManagement.css';
import { FaCalendarAlt, FaClock, FaSwimmer, FaExclamationTriangle, FaFilter, FaSort, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const SessionManagement = () => {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter and sort states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'active', // Changed from 'all' to 'active' to show only active sessions by default
    poolId: 'all',
    type: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'session_date',
    direction: 'asc'
  });
  
  // Form state
  const [formData, setFormData] = useState({
    poolId: '',
    sessionDate: '',
    startTime: '07:00',
    endTime: '08:00',
    capacity: 20,
    type: 'free_swimming'
  });
  
  // Time restrictions based on session type
  const timeRestrictions = {
    'education': { min: '07:00', max: '18:00' },
    'free_swimming': { min: '07:00', max: '24:00' }
  };

  // Available start time options for each session type
  const getStartTimeOptions = (type) => {
    const options = [];
    const restrictions = timeRestrictions[type];
    
    const minHour = parseInt(restrictions.min.split(':')[0], 10);
    const maxHour = parseInt(restrictions.max.split(':')[0], 10);
    
    // For each hour in the range, create an option
    for (let hour = minHour; hour < maxHour; hour++) {
      const formattedHour = hour.toString().padStart(2, '0');
      options.push(`${formattedHour}:00`);
    }
    
    return options;
  };

  // Add this state variable with other state variables
  const [showSessions, setShowSessions] = useState(true);

  useEffect(() => {
    fetchPools();
    fetchSessions();
  }, []);

  // Apply filters and sorting to sessions
  useEffect(() => {
    filterAndSortSessions();
  }, [sessions, filters, sortConfig]);

  const fetchPools = async () => {
    try {
      const response = await axios.get('/api/admin/pools');
      setPools(response.data);
      if (response.data.length > 0) {
        setFormData({...formData, poolId: response.data[0].id});
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load pools');
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/sessions');
      
      // For debugging
      console.log('Raw session data sample:', response.data[0]);
      console.log('Total sessions from server:', response.data.length);
      
      const currentDate = new Date();
      
      // Simplify the approach to determine if a session is expired
      const sessionsWithExpiredFlag = response.data.map(session => {
        // Convert session_date directly if it's properly formatted
        // Format should be YYYY-MM-DD
        let isExpired = false;
        const sessionDateStr = String(session.session_date);
        const timeStr = String(session.start_time || '00:00');
        
        console.log(`Session ${session.id} - Date: ${sessionDateStr}, Time: ${timeStr}`);
        
        // Combine date and time
        const [hours, minutes] = timeStr.split(':');
        
        try {
          // Create a proper date using the ISO string from session_date
          // and then set the hours and minutes
          let sessionDateTime;
          
          if (sessionDateStr.includes('T')) {
            // If it's already an ISO string
            sessionDateTime = new Date(sessionDateStr);
          } else {
            // If it's just a date string
            sessionDateTime = new Date(`${sessionDateStr}T00:00:00Z`);
          }
          
          // Set the time component
          if (hours && minutes) {
            sessionDateTime.setHours(parseInt(hours));
            sessionDateTime.setMinutes(parseInt(minutes));
          }
          
          // Check if the date is valid
          if (!isNaN(sessionDateTime.getTime())) {
            console.log(`Session ${session.id} - Parsed date: ${sessionDateTime.toISOString()}, Current: ${currentDate.toISOString()}`);
            // Check if this date is in the past
            isExpired = sessionDateTime < currentDate;
            console.log(`Session ${session.id} - isExpired: ${isExpired}`);
          } else {
            console.error(`Session ${session.id} - Created invalid date`);
          }
        } catch (err) {
          console.error(`Session ${session.id} - Error creating date:`, err);
        }
        
        return {
          ...session,
          isExpired
        };
      });
      
      console.log("Total processed sessions:", sessionsWithExpiredFlag.length);
      console.log("Active sessions:", sessionsWithExpiredFlag.filter(s => !s.isExpired).length);
      console.log("Expired sessions:", sessionsWithExpiredFlag.filter(s => s.isExpired).length);
      
      setSessions(sessionsWithExpiredFlag);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load sessions');
      setLoading(false);
    }
  };

  const filterAndSortSessions = () => {
    let result = [...sessions];
    
    // Apply filters
    if (filters.status !== 'all') {
      result = result.filter(session => 
        filters.status === 'active' ? !session.isExpired : session.isExpired
      );
    }
    
    if (filters.poolId !== 'all') {
      result = result.filter(session => session.pool_id === parseInt(filters.poolId));
    }
    
    if (filters.type !== 'all') {
      result = result.filter(session => session.type === filters.type);
    }
    
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      result = result.filter(session => {
        const sessionDate = new Date(session.session_date);
        return sessionDate >= fromDate;
      });
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      result = result.filter(session => {
        const sessionDate = new Date(session.session_date);
        return sessionDate <= toDate;
      });
    }
    
    // Sort results
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (sortConfig.key === 'session_date') {
          // Convert to Date objects for proper comparison
          const dateA = new Date(a.session_date);
          const dateB = new Date(b.session_date);
          
          // First compare by date
          const dateComparison = dateA - dateB;
          
          if (dateComparison === 0) {
            // If dates are equal, compare by time
            const timeA = a.start_time.split(':').map(Number);
            const timeB = b.start_time.split(':').map(Number);
            
            // Compare hours first
            if (timeA[0] !== timeB[0]) {
              return timeA[0] - timeB[0];
            }
            
            // Then minutes
            return timeA[1] - timeB[1];
          }
          
          return dateComparison;
        }
        
        // Special handling for initial_capacity to ensure numerical sorting
        if (sortConfig.key === 'initial_capacity') {
          const capacityA = parseInt(a.initial_capacity || 0);
          const capacityB = parseInt(b.initial_capacity || 0);
          return capacityA - capacityB;
        }
        
        // For other fields
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return -1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return 1;
        }
        return 0;
      });
      
      // Apply direction
      if (sortConfig.direction === 'desc') {
        result.reverse();
      }
    }
    
    setFilteredSessions(result);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const resetFilters = () => {
    setFilters({
      status: 'active',
      poolId: 'all',
      type: 'all',
      dateFrom: '',
      dateTo: ''
    });
  };

  const handleStartTimeChange = (e) => {
    const startTime = e.target.value;
    // Calculate end time as 1 hour after start time
    const startHour = parseInt(startTime.split(':')[0], 10);
    const endHour = (startHour + 1).toString().padStart(2, '0');
    const endTime = `${endHour}:00`;
    
    setFormData({
      ...formData,
      startTime,
      endTime
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'startTime') {
      handleStartTimeChange(e);
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Validation for time fields
  const validateTimeFields = () => {
    const { startTime, endTime, type } = formData;
    const restrictions = timeRestrictions[type];
    
    const startHour = parseInt(startTime.split(':')[0], 10);
    const endHour = parseInt(endTime.split(':')[0], 10);
    
    // Check if times are within valid range
    if (startHour < parseInt(restrictions.min.split(':')[0], 10) || endHour > parseInt(restrictions.max.split(':')[0], 10)) {
      setError(`${type === 'education' ? 'Education' : 'Free swimming'} sessions must be scheduled between ${restrictions.min} and ${restrictions.max}`);
      return false;
    }
    
    // Check that end time is exactly 1 hour after start time
    if (endHour !== startHour + 1) {
      setError("Each session must be exactly 1 hour long");
      return false;
    }
    
    return true;
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors
    
    try {
      // Set tomorrow's date as default if no date is selected
      const sessionDate = formData.sessionDate || getTomorrowDate();
      
      const payload = {
        poolId: formData.poolId,
        sessionDate: sessionDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        capacity: formData.capacity,
        type: formData.type
      };
      
      const response = await axios.post('/api/admin/sessions', payload);
      setSuccess('Session created successfully!');
      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
      setShowCreateForm(false);
      resetForm();
      fetchSessions();
    } catch (err) {
      // Display the specific error message from the backend
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      // Scroll to error message to make sure admin sees it
      window.scrollTo(0, 0);
    }
  };

  // Helper function to get tomorrow's date in YYYY-MM-DD format
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const handleDeleteSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      try {
        await axios.delete(`/api/admin/sessions/${sessionId}`);
        setSuccess('Session deleted successfully!');
        // Auto-clear success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
        fetchSessions();
      } catch (err) {
        setError('Failed to delete session');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      poolId: pools.length > 0 ? pools[0].id : '',
      sessionDate: '',
      startTime: '07:00',
      endTime: '08:00',
      capacity: 20,
      type: 'free_swimming'
    });
    setError('');
  };

  return (
    <div className="session-management">
      
      {/* Error message display with icon and styling */}
      {error && (
        <div className="error-message">
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}
      
      {/* Success message display */}
      {success && (
        <div className="success-message">
          <FaCheckCircle />
          <span>{success}</span>
        </div>
      )}
      
      <button 
        className="create-session-btn"
        onClick={() => setShowCreateForm(!showCreateForm)}
      >
        {showCreateForm ? 'Cancel' : 'Create New Session'}
      </button>
      
      {showCreateForm && (
        <div className="session-form">
          <h3>Create New Session</h3>
          <form onSubmit={handleCreateSession}>
            <div className="form-group">
              <label htmlFor="poolId">Select Pool:</label>
              <select 
                id="poolId"
                name="poolId"
                value={formData.poolId}
                onChange={handleInputChange}
                required
              >
                {pools.map(pool => (
                  <option key={pool.id} value={pool.id}>{pool.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="type">Session Type:</label>
              <select 
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
              >
                <option value="free_swimming">Free Swimming</option>
                <option value="education">Education</option>
              </select>
              <span className="time-constraint">
                {formData.type === 'education' 
                  ? 'Education sessions can only be scheduled between 07:00 and 18:00'
                  : 'Free swimming sessions can be scheduled between 07:00 and 24:00'}
              </span>
            </div>
            
            <div className="form-group">
              <label htmlFor="sessionDate">Session Date:</label>
              <input 
                type="date"
                id="sessionDate"
                name="sessionDate"
                value={formData.sessionDate}
                onChange={handleInputChange}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="startTime">Start Time:</label>
              <select
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                required
              >
                {getStartTimeOptions(formData.type).map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              <span className="time-note">Sessions must start at the beginning of an hour</span>
            </div>
            
            <div className="form-group">
              <label htmlFor="endTime">End Time:</label>
              <input 
                type="time"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                required
                readOnly
                className="readonly-input"
              />
              <span className="time-note">End time is automatically set to 1 hour after start time</span>
            </div>
            
            <div className="form-group">
              <label htmlFor="capacity">Capacity:</label>
              <input 
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                min="1"
                required
              />
            </div>
            
            <button type="submit" className="submit-btn">Create Session</button>
          </form>
        </div>
      )}
      
      <div className="sessions-container">
        <div className="sessions-header">
          <h3>Scheduled Sessions</h3>
          <div className="header-buttons">
            <button 
              className="filter-toggle-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FaFilter /> {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button 
              className="toggle-sessions-btn"
              onClick={() => setShowSessions(!showSessions)}
            >
              {showSessions ? 'Hide Sessions' : 'Show Sessions'}
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="filter-section">
            <div className="filter-row">
              <div className="filter-group">
                <label>Status:</label>
                <select 
                  name="status" 
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="all">All Sessions</option>
                  <option value="active">Active Sessions</option>
                  <option value="expired">Expired Sessions</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Pool:</label>
                <select 
                  name="poolId" 
                  value={filters.poolId}
                  onChange={handleFilterChange}
                >
                  <option value="all">All Pools</option>
                  {pools.map(pool => (
                    <option key={pool.id} value={pool.id.toString()}>{pool.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Type:</label>
                <select 
                  name="type" 
                  value={filters.type}
                  onChange={handleFilterChange}
                >
                  <option value="all">All Types</option>
                  <option value="education">Education</option>
                  <option value="free_swimming">Free Swimming</option>
                </select>
              </div>
            </div>
            
            <div className="filter-row">
              <div className="filter-group">
                <label>Date From:</label>
                <input 
                  type="date" 
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                />
              </div>
              
              <div className="filter-group">
                <label>Date To:</label>
                <input 
                  type="date" 
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                />
              </div>
              
              <button className="reset-filters-btn" onClick={resetFilters}>
                Reset Filters
              </button>
            </div>
            
            <div className="sort-buttons">
              <span>Sort by:</span>
              <button 
                className={`sort-btn ${sortConfig.key === 'session_date' ? `active-${sortConfig.direction}` : ''}`}
                onClick={() => handleSort('session_date')}
              >
                Date {sortConfig.key === 'session_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                className={`sort-btn ${sortConfig.key === 'initial_capacity' ? `active-${sortConfig.direction}` : ''}`}
                onClick={() => handleSort('initial_capacity')}
              >
                Capacity {sortConfig.key === 'initial_capacity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                className={`sort-btn ${sortConfig.key === 'pool' ? `active-${sortConfig.direction}` : ''}`}
                onClick={() => handleSort('pool')}
              >
                Pool {sortConfig.key === 'pool' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                className={`sort-btn ${sortConfig.key === 'type' ? `active-${sortConfig.direction}` : ''}`}
                onClick={() => handleSort('type')}
              >
                Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
        )}
        
        {showSessions && (
          loading ? (
            <p>Loading sessions...</p>
          ) : (
            <div className="session-grid">
              {filteredSessions.length === 0 ? (
                <p className="no-sessions">No sessions found matching your criteria.</p>
              ) : (
                filteredSessions.map(session => (
                  <div 
                    key={session.id} 
                    className={`session-card ${session.isExpired ? 'expired-session' : 'active-session'}`}
                  >
                    <div className="session-status-badge">
                      {session.isExpired ? (
                        <><FaTimesCircle /> Expired</>
                      ) : (
                        <><FaCheckCircle /> Active</>
                      )}
                    </div>
                    <div className="session-header">
                      <span className="session-type">
                        <FaSwimmer /> 
                        {session.type === 'education' ? 'Education' : 'Free Swimming'}
                      </span>
                      <span className="session-date">
                        <FaCalendarAlt /> {new Date(session.session_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="session-details">
                      <div className="session-time">
                        <FaClock /> {session.start_time} - {session.end_time}
                      </div>
                      <div className="session-capacity">
                        <FaSwimmer /> Capacity: {session.initial_capacity || 'N/A'}
                      </div>
                      <div className="session-pool">
                        Pool: {pools.find(p => p.id === session.pool_id)?.name || 'Unknown'}
                      </div>
                    </div>
                    <div className="session-actions">
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteSession(session.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SessionManagement;