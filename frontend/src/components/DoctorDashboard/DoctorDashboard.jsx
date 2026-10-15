import React, { useState, useEffect } from 'react';
import { FaBriefcaseMedical, FaNotesMedical, FaUserMd, FaSignOutAlt, FaBell } from 'react-icons/fa';
import HealthReviewQueue from './HealthReviewQueue';
import HealthReportReminders from './HealthReportReminders';
import Navbar from '../Navbar/Navbar';

import './DoctorDashboard.css';

const DoctorDashboard = () => {
  // No tabs needed as we only have one section now
  const [activeSection, setActiveSection] = useState('health-reviews');
  const [doctorInfo, setDoctorInfo] = useState({
    name: 'Dr. Smith',
    role: 'Medical Doctor'
  });

  // Get user info from session storage when component mounts
  useEffect(() => {
    const userInfo = JSON.parse(sessionStorage.getItem('user'));
    if (userInfo) {
      setDoctorInfo({
        name: `Dr. ${userInfo.name || 'User'}`,
        role: 'Medical Doctor'
      });
    }
  }, []);

  // Content is now just the HealthReviewQueue

  return (
    <div className="doctor-dashboard-wrapper">
      <Navbar />
      <div className="doctor-dashboard">
        <div className="doctor-sidebar">
          <div className="doctor-profile">
            <div className="doctor-avatar">
              <FaUserMd />
            </div>
            <h2>{doctorInfo.name}</h2>
            <p>{doctorInfo.role}</p>
          </div>
          <div className="doctor-menu">
            <a
              href="#"
              className={`menu-item ${activeSection === 'health-reviews' ? 'active' : ''}`}
              onClick={() => setActiveSection('health-reviews')}
            >
              <FaNotesMedical />
              Health Information Reviews
            </a>
            <a
              href="#"
              className={`menu-item ${activeSection === 'health-reminders' ? 'active' : ''}`}
              onClick={() => setActiveSection('health-reminders')}
            >
              <FaBell />
              Health Report Reminders
            </a>
          </div>
        </div>
        
        <div className="doctor-content">
          <div className="content-header">
            <h2>{activeSection === 'health-reviews' ? 'Health Information Reviews' : 'Health Report Reminders'}</h2>
          </div>
          <div className="page-card">
            {activeSection === 'health-reviews' && <HealthReviewQueue />}
            {activeSection === 'health-reminders' && <HealthReportReminders />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
