import React, { useState } from 'react';
import PoolManagement from './PoolManagement';
import VerificationQueue from './VerificationQueue';
import SessionManagement from './SessionManagement';
import FeedbackManagement from './FeedbackManagement';
import Navbar from '../Navbar/Navbar';
import './AdminDashboard.css';
import { FaSwimmingPool, FaUserCheck, FaCalendarAlt, FaCommentAlt } from 'react-icons/fa';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('pools');

  const renderContent = () => {
    switch (activeTab) {
      case 'pools':
        return <PoolManagement />;
      case 'verifications':
        return <VerificationQueue />;
      case 'sessions':
        return <SessionManagement />;
      case 'feedback':
        return <FeedbackManagement />;
      default:
        return <PoolManagement />;
    }
  };

  // Add a helper function to format empty values
  const formatValue = (value, type = 'text') => {
    if (!value || value.trim() === '') {
      switch (type) {
        case 'phone':
          return 'No phone number provided';
        case 'gender':
          return 'Not specified';
        case 'date':
          return 'Not provided';
        case 'registration':
          return 'Standard registration';
        default:
          return 'Not provided';
      }
    }
    return value;
  };

  // Update the user information display
  const UserInformation = ({ user }) => {
    return (
      <div className="user-info-container">
        <h2>{user.name} {user.surname}</h2>
        
        <div className="info-field">
          <label>Email:</label>
          <span>{formatValue(user.email)}</span>
        </div>

        <div className="info-field">
          <label>Phone:</label>
          <span>{formatValue(user.phone, 'phone')}</span>
        </div>

        <div className="info-field">
          <label>Registration Type:</label>
          <span>
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
      </div>
    );
  };

  return (
    <div className="admin-dashboard-wrapper">
      <Navbar />
      <div className="admin-dashboard">
        <div className="admin-sidebar">
          <div className="admin-profile">
            <div className="admin-avatar">
              <FaUserCheck />
            </div>
            <h2>Admin Panel</h2>
          </div>
          
          <div className="admin-nav">
            <button 
              className={`nav-button ${activeTab === 'pools' ? 'active' : ''}`}
              onClick={() => setActiveTab('pools')}
            >
              <FaSwimmingPool />
              <span>Pool Management</span>
            </button>
            
            <button 
              className={`nav-button ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => setActiveTab('sessions')}
            >
              <FaCalendarAlt />
              <span>Session Management</span>
            </button>
            
            <button 
              className={`nav-button ${activeTab === 'verifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('verifications')}
            >
              <FaUserCheck />
              <span>User Verifications</span>
            </button>
            
            <button 
              className={`nav-button ${activeTab === 'feedback' ? 'active' : ''}`}
              onClick={() => setActiveTab('feedback')}
            >
              <FaCommentAlt />
              <span>User Feedback</span>
            </button>
          </div>
        </div>
        
        <div className="admin-content">
          <div className="content-header">
            <h1>
              {activeTab === 'pools' && 'Pool Management'}
              {activeTab === 'sessions' && 'Session Management'}
              {activeTab === 'verifications' && 'User Verifications'}
              {activeTab === 'feedback' && 'User Feedback'}
            </h1>
          </div>
          <div className="content-body">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;