import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VerificationQueue.css';
import { API_BASE_URL } from '../../config';
import { formatValue } from '../../utils/formatters';
import { FaExclamationTriangle } from 'react-icons/fa';

const VerificationQueue = () => {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDocuments, setShowDocuments] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [verificationReason, setVerificationReason] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const MAX_REJECTIONS = 3; // Maximum number of rejections allowed
  const [processingVerification, setProcessingVerification] = useState(false); // Track request in progress

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      const response = await axios.get('/api/admin/verifications');
      console.log('Verifications:', response.data); // Debug
      setVerifications(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching verifications:', err);
      setError('Failed to load verifications');
      setLoading(false);
    }
  };

  const handleActionClick = (userId, status) => {
    const user = verifications.find(user => user.id === userId);
    setSelectedUser(user);
    
    setPendingAction({ userId, status });
    setVerificationReason('');
    setShowReasonModal(true);
  };

  const handleVerification = async () => {
    if (!pendingAction || processingVerification) return;
    
    try {
      // Set processing flag to prevent multiple clicks
      setProcessingVerification(true);
      
      const { userId, status } = pendingAction;
      console.log(`Updating user ${userId} to status: ${status}`); // Debug log
      
      const response = await axios.put(`/api/admin/verifications/${userId}`, {
        status,
        reason: verificationReason
      });
      
      console.log('Verification response:', response.data); // Debug log
      
      // On success, update the local state to remove the verified user
      setVerifications(prevVerifications => 
        prevVerifications.filter(user => user.id !== userId)
      );
      
      // Close modal and reset state
      setShowReasonModal(false);
      setPendingAction(null);
      setVerificationReason('');
      
      // Show success message or other UI feedback
      alert(`User ${status} successfully.`);
    } catch (error) {
      console.error('Error updating verification:', error);
      alert(`Error: ${error.response?.data?.error || 'Failed to update verification'}`);
    } finally {
      // Always reset processing state when done
      setProcessingVerification(false);
    }
  };

  const handleViewDocuments = (user) => {
    setSelectedUser(user);
    setShowDocuments(true);
  };

  return (
    <div className="verification-queue">
      <h2>Pending Verifications</h2>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : verifications.length === 0 ? (
        <div className="no-verifications">
          <p>No pending verifications</p>
        </div>
      ) : (
        <div className="verification-list">
          {verifications.map(user => (
            <div key={user.id} className="verification-item">
              <div className="user-details">
                <h3>{user.name} {user.surname}</h3>
                
                <div className="info-field">
                  <label>Email:</label>
                  <span>{user.email}</span>
                </div>

                <div className="info-field">
                  <label>Rejection Count:</label>
                  <span className={user.rejection_count >= MAX_REJECTIONS ? 'max-rejections' : ''}>
                    {user.rejection_count || 0} 
                    {user.rejection_count >= MAX_REJECTIONS && 
                      <span className="rejection-warning"><FaExclamationTriangle /> Max rejections reached</span>
                    }
                  </span>
                </div>

                <div className="info-field">
                  <label>Phone:</label>
                  <span>{formatValue(user.phone, 'phone')}</span>
                </div>

                <div className="info-field">
                  <label>Registration Type:</label>
                  <span data-social={!!user.provider}>
                    {user.provider ? `Social (${user.provider})` : formatValue(null, 'registration')}
                  </span>
                </div>

                <div className="info-field">
                  <label>Date of Birth:</label>
                  <span>{formatValue(user.date_of_birth, 'date')}</span>
                </div>

                <div className="info-field">
                  <label>Gender:</label>
                  <span>{formatValue(user.gender, 'gender')}</span>
                </div>
                
                <div className="documents">
                  <button 
                    className="view-documents-btn"
                    onClick={() => handleViewDocuments(user)}
                  >
                    View Documents
                  </button>
                </div>
              </div>
              
              <div className="verification-actions">
                <button
                  className="approve-btn"
                  onClick={() => handleActionClick(user.id, 'approved')}
                >
                  Approve
                </button>
                <button
                  className="reject-btn"
                  onClick={() => handleActionClick(user.id, 'rejected')}
                  disabled={user.rejection_count >= MAX_REJECTIONS}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showDocuments && selectedUser && (
        <div className="documents-modal">
          <div className="documents-modal-content">
            <div className="documents-header">
              <h3>{selectedUser.name} {selectedUser.surname}'s Documents</h3>
              <button 
                className="close-modal" 
                onClick={() => setShowDocuments(false)}
              >
                ×
              </button>
            </div>
            <div className="documents-container">
              <div className="document-frame">
                <h4>ID Card</h4>
                <iframe
                  src={selectedUser.id_card_path?.startsWith('https://') ? selectedUser.id_card_path : `${API_BASE_URL}/uploads/${selectedUser.id_card_path}`}
                  title="ID Card"
                />
              </div>
              <div className="document-frame">
                <h4>Profile Photo</h4>
                <img
                  src={selectedUser.profile_photo_path?.startsWith('https://') ? selectedUser.profile_photo_path : `${API_BASE_URL}/uploads/${selectedUser.profile_photo_path}`}
                  alt="Profile"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {showReasonModal && pendingAction && (
        <div className="reason-modal">
          <div className="reason-modal-content">
            <div className="reason-header">
              <h3>
                {pendingAction.status === 'approved' ? 
                  'Approve' : 'Reject'} {selectedUser?.name} {selectedUser?.surname}
              </h3>
              <button 
                className="close-modal" 
                onClick={() => setShowReasonModal(false)}
                disabled={processingVerification}
              >
                ×
              </button>
            </div>
            <div className="reason-container">
              <p>Please provide a reason for {pendingAction.status === 'approved' ? 'approval' : 'rejection'}:</p>
              <textarea
                className="reason-textarea"
                value={verificationReason}
                onChange={(e) => setVerificationReason(e.target.value)}
                placeholder={pendingAction.status === 'approved' ? 
                  'Example: All documents verified successfully' : 
                  'Example: ID card doesn\'t match profile information'}
                required
                disabled={processingVerification}
              />
              <div className="reason-actions">
                <button
                  className="cancel-reason-btn"
                  onClick={() => setShowReasonModal(false)}
                  disabled={processingVerification}
                >
                  Cancel
                </button>
                <button
                  className={`submit-reason-btn ${pendingAction.status}-btn ${processingVerification ? 'processing' : ''}`}
                  onClick={handleVerification}
                  disabled={!verificationReason.trim() || processingVerification}
                >
                  {processingVerification 
                    ? 'Processing...' 
                    : `Confirm ${pendingAction.status === 'approved' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationQueue;