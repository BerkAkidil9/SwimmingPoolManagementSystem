import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCommentAlt, FaUser, FaCalendarAlt, FaCheck, FaTimes } from 'react-icons/fa';
import './FeedbackManagement.css';
import { formatAdminDateTime } from '../../utils/dateUtils';

const FeedbackManagement = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/feedback');
      setFeedback(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load feedback');
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (feedbackId, status) => {
    try {
      await axios.put(`/api/admin/feedback/${feedbackId}`, { status });
      
      // Update the feedback list
      setFeedback(prevFeedback => 
        prevFeedback.map(item => 
          item.id === feedbackId ? { ...item, status } : item
        )
      );
      
      // If we're viewing this feedback, update its status
      if (selectedFeedback && selectedFeedback.id === feedbackId) {
        setSelectedFeedback({ ...selectedFeedback, status });
      }
    } catch (err) {
      setError('Failed to update feedback status');
    }
  };

  const filteredFeedback = filterStatus === 'all' 
    ? feedback 
    : feedback.filter(item => item.status === filterStatus);

  if (loading) {
    return <div className="loading">Loading feedback...</div>;
  }

  return (
    <div className="feedback-management">
      <div className="feedback-filters">
        <button 
          className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All Feedback
        </button>
        <button 
          className={`filter-btn ${filterStatus === 'new' ? 'active' : ''}`}
          onClick={() => setFilterStatus('new')}
        >
          New
        </button>
        <button 
          className={`filter-btn ${filterStatus === 'read' ? 'active' : ''}`}
          onClick={() => setFilterStatus('read')}
        >
          Read
        </button>
        <button 
          className={`filter-btn ${filterStatus === 'archived' ? 'active' : ''}`}
          onClick={() => setFilterStatus('archived')}
        >
          Archived
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="feedback-container">
        <div className="feedback-list">
          {filteredFeedback.length > 0 ? (
            filteredFeedback.map(item => (
              <div 
                key={item.id} 
                className={`feedback-item ${item.status} ${selectedFeedback?.id === item.id ? 'selected' : ''}`}
                onClick={() => setSelectedFeedback(item)}
              >
                <div className="feedback-item-header">
                  <h3>{item.subject}</h3>
                  <span className={`status-badge ${item.status}`}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </div>
                <div className="feedback-meta">
                  <div className="feedback-user">
                    <FaUser />
                    <span>{item.user_name}</span>
                  </div>
                  <div className="feedback-date">
                    <FaCalendarAlt />
                    <span>{formatAdminDateTime(item.created_at)}</span>
                  </div>
                </div>
                <p className="feedback-preview">{item.message.substring(0, 100)}...</p>
              </div>
            ))
          ) : (
            <div className="no-feedback">
              <FaCommentAlt />
              <p>No feedback found for the selected filter.</p>
            </div>
          )}
        </div>

        <div className="feedback-detail">
          {selectedFeedback ? (
            <>
              <div className="detail-header">
                <h2>{selectedFeedback.subject}</h2>
                <div className="feedback-actions">
                  <button 
                    className={`status-btn mark-read ${selectedFeedback.status === 'read' ? 'active' : ''}`}
                    onClick={() => handleStatusChange(selectedFeedback.id, 'read')}
                    disabled={selectedFeedback.status === 'read'}
                  >
                    <FaCheck /> Mark as Read
                  </button>
                  <button 
                    className={`status-btn archive ${selectedFeedback.status === 'archived' ? 'active' : ''}`}
                    onClick={() => handleStatusChange(selectedFeedback.id, 'archived')}
                    disabled={selectedFeedback.status === 'archived'}
                  >
                    <FaTimes /> Archive
                  </button>
                </div>
              </div>
              <div className="detail-meta">
                <div className="meta-item">
                  <strong>From:</strong> {selectedFeedback.user_name} ({selectedFeedback.user_email})
                </div>
                <div className="meta-item">
                  <strong>Received:</strong> {formatAdminDateTime(selectedFeedback.created_at)}
                </div>
                <div className="meta-item">
                  <strong>Status:</strong> 
                  <span className={`status-indicator ${selectedFeedback.status}`}>
                    {selectedFeedback.status.charAt(0).toUpperCase() + selectedFeedback.status.slice(1)}
                  </span>
                </div>
              </div>
              <div className="detail-content">
                <p>{selectedFeedback.message}</p>
              </div>
            </>
          ) : (
            <div className="no-feedback-selected">
              <FaCommentAlt />
              <p>Select feedback to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackManagement; 