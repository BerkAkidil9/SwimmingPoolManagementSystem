import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import { FaSwimmingPool, FaUserCog, FaUserCheck, FaStethoscope, FaChalkboardTeacher, FaCreditCard, FaUserEdit } from 'react-icons/fa';
import poolImage from '../../logo/ozu_havuz_0.jpg';
import './HomePage.css';

const HomePage = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
  }, []);

  const handleRoleNavigation = (path) => {
    navigate(path);
  };

  const MemberPanelCard = () => (
    <div className="homepage-card member-card" onClick={() => handleRoleNavigation('/member/dashboard')}>
      <FaSwimmingPool className="card-icon" />
      <h3>Member Dashboard</h3>
      <p>Manage your reservations, explore pools and plan your sessions.</p>
      <span className="card-link">Go to Panel →</span>
    </div>
  );

  const getRoleCard = () => {
    if (!user || !user.role) return null;
    const role = user.role.toLowerCase();

    if (role === 'admin') {
      return (
        <div className="homepage-card admin-card" onClick={() => handleRoleNavigation('/admin')}>
          <FaUserCog className="card-icon" />
          <h3>Admin Panel</h3>
          <p>Manage pools, user verifications, sessions and feedback.</p>
          <span className="card-link">Go to Panel →</span>
        </div>
      );
    }
    if (role === 'doctor') {
      return (
        <div className="homepage-card doctor-card" onClick={() => handleRoleNavigation('/doctor/dashboard')}>
          <FaStethoscope className="card-icon" />
          <h3>Doctor Dashboard</h3>
          <p>Review and approve health reports.</p>
          <span className="card-link">Go to Panel →</span>
        </div>
      );
    }
    if (role === 'coach') {
      return (
        <div className="homepage-card coach-card" onClick={() => handleRoleNavigation('/coach/dashboard')}>
          <FaChalkboardTeacher className="card-icon" />
          <h3>Coach Dashboard</h3>
          <p>Manage your training sessions and members.</p>
          <span className="card-link">Go to Panel →</span>
        </div>
      );
    }
    if (role === 'staff') {
      return (
        <div className="homepage-card staff-card" onClick={() => handleRoleNavigation('/staff/verification')}>
          <FaUserCheck className="card-icon" />
          <h3>Staff Verification</h3>
          <p>Verify member registrations.</p>
          <span className="card-link">Go to Panel →</span>
        </div>
      );
    }
    // member / default - only role card, no extra member panel
    return <MemberPanelCard />;
  };

  // Admin, doctor, coach, staff can also use member features
  const showMemberPanel = () => {
    if (!user || !user.role) return false;
    const role = user.role.toLowerCase();
    return ['admin', 'doctor', 'coach', 'staff'].includes(role);
  };

  return (
    <div className="homepage">
      <Navbar />
      <main className="homepage-main">
        <section className="homepage-hero">
          <div className="homepage-hero-content">
            <h1>
              Welcome{user?.name ? `, ${user.name}` : ''}
            </h1>
            <p className="homepage-subtitle">
              You have logged in to Swim Center. Continue from the options below.
            </p>
          </div>
          <div className="homepage-hero-image">
            <img src={poolImage} alt="Swimming Pool" />
          </div>
        </section>

        <section className="homepage-cards">
          <h2>Quick Access</h2>
          <div className="cards-grid">
            {getRoleCard()}
            {showMemberPanel() && <MemberPanelCard />}
            <div className="homepage-card secondary-card" onClick={() => handleRoleNavigation('/billing')}>
              <FaCreditCard className="card-icon" />
              <h3>Billing</h3>
              <p>View your invoices and payments.</p>
              <span className="card-link">Go →</span>
            </div>
            <Link to="/edit-profile" className="homepage-card secondary-card link-card">
              <FaUserEdit className="card-icon" />
              <h3>Edit Profile</h3>
              <p>Update your account information.</p>
              <span className="card-link">Go →</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
