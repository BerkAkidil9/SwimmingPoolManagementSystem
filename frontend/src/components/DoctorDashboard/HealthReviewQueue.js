import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Form, Modal, Spinner, ListGroup, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaNotesMedical, FaHeartbeat, FaWeight, FaRulerVertical, FaUserMd, FaAllergies, FaSearch, FaMedkit, FaFileMedical, FaEye, FaFileDownload } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import './HealthReviewQueue.css';

const HealthReviewQueue = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showHealthReportsModal, setShowHealthReportsModal] = useState(false);
  const [showInvalidDocModal, setShowInvalidDocModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalReason, setApprovalReason] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [invalidDocReason, setInvalidDocReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [healthReports, setHealthReports] = useState([]);
  const [currentReport, setCurrentReport] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/doctor/health-reviews');
      setUsers(response.data);
      setError(null);
    } catch (err) {
      setError('Error fetching users: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Debug: log the first user to see exact data structure
  useEffect(() => {
    if (users.length > 0) {
      console.log('First user data:', users[0]);
    }
  }, [users]);

  const handleRequestReport = async () => {
    if (!reportReason.trim()) {
      return;
    }

    try {
      setProcessing(true);
      await axios.put(`/api/doctor/health-status/${currentUser.id}`, {
        status: 'needs_report',
        reason: reportReason
      });
      
      setShowReportModal(false);
      setReportReason('');
      setCurrentUser(null);
      
      // Update the user list
      fetchUsers();
    } catch (err) {
      setError('Error requesting health report: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!approvalReason.trim()) {
      return;
    }
    try {
      setProcessing(true);
      
      // Update user status
      await axios.put(`/api/doctor/health-status/${currentUser.id}`, {
        status: 'approved',
        reason: approvalReason
      });
      
      // Update latest report status
      await updateLatestReportStatus(currentUser.id, 'approved', approvalReason);
      
      setShowApprovalModal(false);
      setApprovalReason('');
      setCurrentUser(null);
      
      // Update the patient list
      fetchUsers();
    } catch (err) {
      setError('Error approving health status: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      return;
    }

    try {
      setProcessing(true);
      
      // Update user status
      await axios.put(`/api/doctor/health-status/${currentUser.id}`, {
        status: 'rejected',
        reason: rejectReason
      });
      
      // Update latest report status
      await updateLatestReportStatus(currentUser.id, 'rejected', rejectReason);
      
      setShowRejectModal(false);
      setRejectReason('');
      setCurrentUser(null);
      
      // Update the patient list
      fetchUsers();
    } catch (err) {
      setError('Error rejecting health status: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleViewDetails = (user) => {
    setCurrentUser(user);
  };

  const handleShowApprovalModal = (user) => {
    setCurrentUser(user);
    setShowApprovalModal(true);
    setApprovalReason('');
  };

  const handleShowReportModal = (user) => {
    setCurrentUser(user);
    setShowReportModal(true);
    setReportReason('');
  };
  
  const handleShowRejectModal = (user) => {
    setCurrentUser(user);
    setShowRejectModal(true);
    setRejectReason('');
  };

  const fetchHealthReports = async (userId) => {
    try {
      setLoadingReports(true);
      const response = await axios.get(`/api/doctor/health-reports/${userId}`);
      
      // Sort reports by creation date (oldest first) - Report #1 = first upload, Report #2 = second upload
      const sortedReports = response.data.sort((a, b) => {
        return new Date(a.created_at) - new Date(b.created_at);
      });
      
      setHealthReports(sortedReports);
      setShowHealthReportsModal(true);
    } catch (err) {
      setError('Error fetching health reports: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingReports(false);
    }
  };
  
  // Handle marking a document as invalid and sending notification
  const handleInvalidDocument = async () => {
    if (!invalidDocReason.trim() || !currentReport || !currentUser) {
      return;
    }

    try {
      setProcessing(true);
      
      // Call the API to mark document as invalid and send notification
      const response = await axios.post('/api/reminders/send-invalid-document-notification', {
        userId: currentUser.id,
        invalidReason: invalidDocReason,
        reportId: currentReport.id
      });
      
      if (response.data.success) {
        // Close the modal and reset state
        setShowInvalidDocModal(false);
        setInvalidDocReason('');
        setCurrentReport(null);
        
        // Refresh the data
        fetchUsers();
        // Close the health reports modal
        setShowHealthReportsModal(false);
      } else {
        setError('Failed to mark document as invalid: ' + response.data.error);
      }
    } catch (err) {
      setError('Error marking document as invalid: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };
  
  // Show the invalid document modal for a specific report
  const showInvalidDocumentModal = (report) => {
    setCurrentReport(report);
    setInvalidDocReason('');
    setShowHealthReportsModal(false); // Close Health Reports modal first so Invalid modal appears on top
    setShowInvalidDocModal(true);
  };

  const handleViewHealthReports = (user) => {
    fetchHealthReports(user.id);
    setCurrentUser(user);
  };
  
  // Update both user status and the latest report status
  const updateLatestReportStatus = async (userId, status, notes) => {
    try {
      // First, get the latest report for this user
      const response = await axios.get(`/api/doctor/health-reports/${userId}`);
      
      if (response.data && response.data.length > 0) {
        // Sort by date (newest first)
        const sortedReports = response.data.sort((a, b) => {
          return new Date(b.created_at) - new Date(a.created_at);
        });
        
        const latestReport = sortedReports[0];
        
        // Update the status of the latest report
        await axios.put(`/api/doctor/health-reports/${latestReport.id}`, {
          status: status,
          doctor_notes: notes
        });
      }
    } catch (err) {
      console.error('Error updating report status:', err);
      throw err;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredUsers = users.filter(user => {
    // First apply text search filter
    const matchesSearch = searchTerm === '' || 
      `${user.name} ${user.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Then apply category filter (report_count may come as string from PostgreSQL)
    const reportCount = Number(user.report_count) || 0;
    const status = String(user.health_status || '').toLowerCase();
    let matchesCategory = true;
    if (activeFilter === 'reports_uploaded') {
      matchesCategory = reportCount > 0;
    } else if (activeFilter === 'invalid_reports') {
      matchesCategory = status === 'needs_report' && reportCount > 0;
    } else if (activeFilter === 'awaiting_first_review') {
      matchesCategory = status === 'pending' && reportCount === 0;
    } else if (activeFilter === 'report_requested_no_upload') {
      matchesCategory = status === 'needs_report' && reportCount === 0;
    }
    
    return matchesSearch && matchesCategory;
  });

  const getHealthStatusBadge = (status) => {
    switch(status) {
      case 'pending':
        return <Badge bg="warning"></Badge>;
      case 'needs_report':
        return <Badge bg="info">Needs Report</Badge>;
      case 'approved':
        return <Badge bg="success">Approved</Badge>;
      case 'rejected':
        return <Badge bg="danger">Rejected</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="health-review-queue">
      <Card className="panel-card">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <h3 className="text-dark"><FaNotesMedical className="me-2" /> Health Information Reviews</h3>
            <div className="search-container">
              <div className="position-relative">
                <Form.Control
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <FaSearch className="search-icon" />
              </div>
            </div>
          </div>
          
          {/* Filter buttons */}
          <div className="mt-3 filter-buttons-row">
            <Button 
              variant={activeFilter === 'all' ? 'primary' : 'outline-primary'} 
              className="filter-button"
              onClick={() => setActiveFilter('all')}
            >
              All Users
            </Button>
            <Button 
              variant={activeFilter === 'reports_uploaded' ? 'primary' : 'outline-primary'} 
              className="filter-button"
              onClick={() => setActiveFilter('reports_uploaded')}
            >
              <FaFileMedical className="me-1" />
              Reports Uploaded
            </Button>
            <Button 
              variant={activeFilter === 'invalid_reports' ? 'primary' : 'outline-primary'} 
              className="filter-button"
              onClick={() => setActiveFilter('invalid_reports')}
            >
              <span role="img" aria-label="Invalid">❌</span> Invalid Reports
            </Button>
            <Button 
              variant={activeFilter === 'awaiting_first_review' ? 'primary' : 'outline-primary'} 
              className="filter-button"
              onClick={() => setActiveFilter('awaiting_first_review')}
            >
              First Time Review
            </Button>
            <Button 
              variant={activeFilter === 'report_requested_no_upload' ? 'primary' : 'outline-primary'} 
              className="filter-button"
              onClick={() => setActiveFilter('report_requested_no_upload')}
            >
              Awaiting Upload
            </Button>
          </div>
          
          {/* Statistics Summary */}
          <div className="mt-3 pt-2 border-top">
            <div className="d-flex flex-wrap">
              <div className="me-4 mb-2">
                <span className="text-dark fw-bold">Total Pending: </span>
                <Badge bg="secondary">{users.length}</Badge>
              </div>
              <div className="me-4 mb-2">
                <span className="text-dark fw-bold">With Uploaded Reports: </span>
                <Badge bg="primary">{users.filter(p => (Number(p.report_count) || 0) > 0).length}</Badge>
              </div>
              <div className="me-4 mb-2">
                <span className="text-dark fw-bold">Invalid Reports: </span>
                <Badge bg="danger">{users.filter(p => String(p.health_status || '').toLowerCase() === 'needs_report' && (Number(p.report_count) || 0) > 0).length}</Badge>
              </div>
              <div className="me-4 mb-2">
                <span className="text-dark fw-bold">Awaiting First Review: </span>
                <Badge bg="warning">{users.filter(p => String(p.health_status || '').toLowerCase() === 'pending' && (Number(p.report_count) || 0) === 0).length}</Badge>
              </div>
              <div className="mb-2">
                <span className="text-dark fw-bold">Awaiting Upload: </span>
                <Badge bg="info">{users.filter(p => String(p.health_status || '').toLowerCase() === 'needs_report' && (Number(p.report_count) || 0) === 0).length}</Badge>
              </div>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" variant="primary">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-2 text-dark">Loading users...</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="no-data-message">
              <FaNotesMedical />
              {activeFilter === 'all' && (
                <>
                  <h4 className="text-dark">No users waiting for health review</h4>
                  <p className="text-muted">When users register and are verified by an admin, they will appear here for health assessment.</p>
                </>
              )}
              {activeFilter === 'reports_uploaded' && (
                <>
                  <h4 className="text-dark">No users have uploaded health reports</h4>
                  <p className="text-muted">When users upload their health reports, they will appear in this view.</p>
                </>
              )}
              {activeFilter === 'awaiting_first_review' && (
                <>
                  <h4 className="text-dark">No users waiting for first review</h4>
                  <p className="text-muted">All new users have either been reviewed or have uploaded reports.</p>
                </>
              )}
              {activeFilter === 'report_requested_no_upload' && (
                <>
                  <h4 className="text-dark">No users awaiting report upload</h4>
                  <p className="text-muted">All users who were asked to provide additional documentation have uploaded their reports or have been processed.</p>
                </>
              )}
            </div>
          ) : (
            <Row xs={1} md={1} className="g-4">
              {filteredUsers.map((user) => (
                <Col key={user.id}>
                  <Card className={`health-review-card ${user.report_count > 0 ? 'has-reports' : ''} ${user.health_status === 'needs_report' ? 'needs-report' : ''}`}>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h4 className="text-dark"><FaUserMd className="me-2" /> {user.name} {user.surname}</h4>
                          <p className="text-muted mb-0">
                            Email: {user.email}
                          </p>
                          {user.report_count > 0 && (
                            <div className="mt-1">
                              <Badge className="report-badge" pill>
                                <FaFileMedical className="me-1" /> {user.report_count} {user.report_count === 1 ? 'Report' : 'Reports'} Uploaded
                              </Badge>
                            </div>
                          )}
                          {user.health_report_request_count > 0 && (
                            <div className="mt-1">
                              <Badge bg="secondary" className="request-count-badge" pill>
                                Report Requests: {user.health_report_request_count}/3
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div>
                          {getHealthStatusBadge(user.health_status)}
                        </div>
                      </div>

                      <div className="health-info-section basic-health-section">
                        <h4 className="text-dark"><FaHeartbeat /> Basic Health Information</h4>
                        <Row>
                          <Col md={4}>
                            <p><strong>Blood Type:</strong> {user.blood_type}</p>
                          </Col>
                          <Col md={4}>
                            <p><strong><FaRulerVertical /> Height:</strong> {user.height} cm</p>
                          </Col>
                          <Col md={4}>
                            <p><strong><FaWeight /> Weight:</strong> {user.weight} kg</p>
                          </Col>
                        </Row>

                        <Row>
                          <Col md={6}>
                            <p><strong><FaAllergies /> Allergies:</strong> {user.allergies || 'None'}</p>
                          </Col>
                          <Col md={6}>
                            <p><strong><FaMedkit /> Medications:</strong> {user.medications || 'None'}</p>
                          </Col>
                        </Row>

                        <p><strong>Chronic Conditions:</strong> {user.chronic_conditions || 'None'}</p>

                        <p>
                          <strong>Emergency Contact:</strong> {user.emergency_contact_name} ({user.emergency_contact_phone})
                          {user.emergency_contact_relationship && 
                            <span className="ms-2 text-secondary">
                              - {user.emergency_contact_relationship === 'Other' 
                                ? user.emergency_contact_relationship_other 
                                : user.emergency_contact_relationship}
                            </span>
                          }
                        </p>
                      </div>

                      <div className="health-info-section assessment-section">
                        <h4 className="text-dark"><FaNotesMedical /> Health Assessment</h4>
                        <div className="health-questions">
                          <div className="health-question">
                            <span className="health-question-label">Heart problems/cardiovascular diseases:</span>
                            <div className={`health-answer ${user.has_heart_problems === 'yes' || user.has_heart_problems === 1 || user.has_heart_problems === '1' || user.has_heart_problems === true ? 'yes' : 'no'}`}>
                              {user.has_heart_problems === 'yes' || user.has_heart_problems === 1 || user.has_heart_problems === '1' || user.has_heart_problems === true ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <div className="health-question">
                            <span className="health-question-label">Chest pain during physical activity:</span>
                            <div className={`health-answer ${user.chest_pain_activity === 'yes' || user.chest_pain_activity === 1 || user.chest_pain_activity === '1' || user.chest_pain_activity === true ? 'yes' : 'no'}`}>
                              {user.chest_pain_activity === 'yes' || user.chest_pain_activity === 1 || user.chest_pain_activity === '1' || user.chest_pain_activity === true ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <div className="health-question">
                            <span className="health-question-label">Balance problems or dizziness:</span>
                            <div className={`health-answer ${user.balance_dizziness === 'yes' || user.balance_dizziness === 1 || user.balance_dizziness === '1' || user.balance_dizziness === true ? 'yes' : 'no'}`}>
                              {user.balance_dizziness === 'yes' || user.balance_dizziness === 1 || user.balance_dizziness === '1' || user.balance_dizziness === true ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <div className="health-question">
                            <span className="health-question-label">Other chronic disease:</span>
                            <div className={`health-answer ${user.other_chronic_disease === 'yes' || user.other_chronic_disease === 1 || user.other_chronic_disease === '1' || user.other_chronic_disease === true ? 'yes' : 'no'}`}>
                              {user.other_chronic_disease === 'yes' || user.other_chronic_disease === 1 || user.other_chronic_disease === '1' || user.other_chronic_disease === true ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <div className="health-question">
                            <span className="health-question-label">Prescribed medication:</span>
                            <div className={`health-answer ${user.prescribed_medication === 'yes' || user.prescribed_medication === 1 || user.prescribed_medication === '1' || user.prescribed_medication === true ? 'yes' : 'no'}`}>
                              {user.prescribed_medication === 'yes' || user.prescribed_medication === 1 || user.prescribed_medication === '1' || user.prescribed_medication === true ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <div className="health-question">
                            <span className="health-question-label">Bone or joint issues:</span>
                            <div className={`health-answer ${user.bone_joint_issues === 'yes' || user.bone_joint_issues === 1 || user.bone_joint_issues === '1' || user.bone_joint_issues === true ? 'yes' : 'no'}`}>
                              {user.bone_joint_issues === 'yes' || user.bone_joint_issues === 1 || user.bone_joint_issues === '1' || user.bone_joint_issues === true ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <div className="health-question">
                            <span className="health-question-label">Doctor supervised physical activity:</span>
                            <div className={`health-answer ${user.doctor_supervised_activity === 'yes' || user.doctor_supervised_activity === 1 || user.doctor_supervised_activity === '1' || user.doctor_supervised_activity === true ? 'yes' : 'no'}`}>
                              {user.doctor_supervised_activity === 'yes' || user.doctor_supervised_activity === 1 || user.doctor_supervised_activity === '1' || user.doctor_supervised_activity === true ? 'Yes' : 'No'}
                            </div>
                          </div>
                        </div>

                        {user.health_additional_info && (
                          <div className="mt-2">
                            <strong>Additional Information:</strong>
                            <p className="ms-3">{user.health_additional_info}</p>
                          </div>
                        )}
                      </div>

                      <div className="health-review-actions mt-4">
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip id={`tooltip-approve-${user.id}`}>
                            {user.health_status === 'needs_report' && (user.report_count || 0) === 0 
                              ? "Cannot approve until the user has uploaded the requested health report" 
                              : "Approve health status"}
                          </Tooltip>}
                        >
                          <span>
                            <Button 
                              variant="success" 
                              size="sm" 
                              className="me-2"
                              onClick={() => handleShowApprovalModal(user)}
                              disabled={user.health_status === 'needs_report' && (user.report_count || 0) === 0}
                            >
                              <i className="fas fa-check-circle me-1"></i>
                              Approve
                            </Button>
                          </span>
                        </OverlayTrigger>
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip id={`tooltip-request-${user.id}`}>
                            {user.report_count > 0 ? "The user already has an uploaded report pending review" : 
                             user.health_report_request_count >= 3 ? "Maximum request limit reached (3/3)" : 
                             user.health_status === 'needs_report' ? "This user already has a pending report request awaiting upload" :
                             "Request health report from this user"}
                          </Tooltip>}
                        >
                          <span>
                            <Button 
                              variant="warning" 
                              size="sm"
                              onClick={() => handleShowReportModal(user)}
                              className="me-2"
                              disabled={user.report_count > 0 || user.health_report_request_count >= 3 || user.health_status === 'needs_report'}
                            >
                              <i className="fas fa-file-medical me-1"></i>
                              Request Report
                              {user.health_report_request_count > 0 && ` (${user.health_report_request_count}/3)`}
                            </Button>
                          </span>
                        </OverlayTrigger>
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip id={`tooltip-reject-${user.id}`}>
                            {user.health_status === 'needs_report' && (user.report_count || 0) === 0 
                              ? "Reject (e.g. user did not submit requested report)" 
                              : "Reject health status"}
                          </Tooltip>}
                        >
                          <span>
                            <Button 
                              variant="danger" 
                              size="sm"
                              className="me-2"
                              onClick={() => handleShowRejectModal(user)}
                            >
                              <i className="fas fa-times-circle me-1"></i>
                              Reject
                            </Button>
                          </span>
                        </OverlayTrigger>
                        {user.report_count > 0 && (
                          <Button 
                            variant="info" 
                            size="sm"
                            onClick={() => handleViewHealthReports(user)}
                            className="me-2"
                          >
                            <i className="fas fa-file-medical me-1"></i>
                            View Reports
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="reason-modal">
          <div className="reason-modal-content">
            <div className="reason-header">
              <h3>Approve Health Status for {currentUser?.name} {currentUser?.surname}</h3>
              <button 
                className="close-modal" 
                onClick={() => setShowApprovalModal(false)}
                disabled={processing}
              >
                ×
              </button>
            </div>
            <div className="reason-container">
              <p className="required-field">Approval notes:</p>
              <textarea
                className="reason-textarea"
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder="Example: All health information verified successfully"
                required
                disabled={processing}
              />
              <div className="reason-actions">
                <button
                  className="cancel-reason-btn"
                  onClick={() => setShowApprovalModal(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  className="submit-reason-btn approve-btn"
                  onClick={handleApprove}
                  disabled={processing || !approvalReason.trim()}
                >
                  {processing ? 'Processing...' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Additional Health Report Modal */}
      {showReportModal && (
        <div className="reason-modal">
          <div className="reason-modal-content">
            <div className="reason-header">
              <h3>Request Health Report from {currentUser?.name} {currentUser?.surname}</h3>
              <button 
                className="close-modal" 
                onClick={() => setShowReportModal(false)}
                disabled={processing}
              >
                ×
              </button>
            </div>
            <div className="reason-container">
              <p className="required-field">Reason for requesting health report:</p>
              <textarea
                className="reason-textarea"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Example: Need additional documentation about chronic conditions"
                required
                disabled={processing}
              />
              <p className="text-muted small mb-0">This will be sent to the user via email with upload instructions.</p>
              <div className="reason-actions">
                <button
                  className="cancel-reason-btn"
                  onClick={() => setShowReportModal(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  className="submit-reason-btn report-btn"
                  onClick={handleRequestReport}
                  disabled={!reportReason.trim() || processing}
                >
                  {processing ? 'Processing...' : 'Request Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reject Health Status Modal */}
      {showRejectModal && (
        <div className="reason-modal">
          <div className="reason-modal-content">
            <div className="reason-header">
              <h3>Reject Health Status for {currentUser?.name} {currentUser?.surname}</h3>
              <button 
                className="close-modal" 
                onClick={() => setShowRejectModal(false)}
                disabled={processing}
              >
                ×
              </button>
            </div>
            <div className="reason-container">
              <p className="required-field">Reason for rejection (required):</p>
              <textarea
                className="reason-textarea"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Example: Medical condition incompatible with swimming activities"
                required
                disabled={processing}
              />
              <p className="text-muted small mb-0">The user will be notified via email with this reason.</p>
              <div className="reason-actions">
                <button
                  className="cancel-reason-btn"
                  onClick={() => setShowRejectModal(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  className="submit-reason-btn reject-btn"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || processing}
                  style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
                >
                  {processing ? 'Processing...' : 'Reject Health Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Invalid Document Modal */}
      {showInvalidDocModal && currentReport && currentUser && (
        <div className="reason-modal">
          <div className="reason-modal-content">
            <div className="reason-header">
              <h3>Mark Document as Invalid</h3>
              <button 
                className="close-modal" 
                onClick={() => {
                  setShowInvalidDocModal(false);
                  if (currentUser) setShowHealthReportsModal(true); // Re-open Health Reports when cancelling
                }}
              >
                ×
              </button>
            </div>
            <div className="reason-container">
              <p>You are about to mark the health report document as invalid for <strong>{currentUser?.name} {currentUser?.surname}</strong>.</p>
              <p>This will:</p>
              <ul>
                <li>Mark this specific document as invalid</li>
                <li>Change the user's status to 'needs_report'</li>
                <li>Send them an email notification with your explanation</li>
                <li>Start a new health report request process</li>
              </ul>
              
              <label>Please explain why this document is invalid:</label>
              <textarea
                className="reason-textarea"
                value={invalidDocReason}
                onChange={(e) => setInvalidDocReason(e.target.value)}
                placeholder="Example: Document is illegible, missing required tests, not signed by a medical professional, etc."
                required
                disabled={processing}
              />
              <p className="text-muted small mb-0">This explanation will be sent to the patient.</p>
              
              <div className="reason-actions">
                <button
                  className="cancel-reason-btn"
                  onClick={() => {
                    setShowInvalidDocModal(false);
                    if (currentUser) setShowHealthReportsModal(true); // Re-open Health Reports when cancelling
                  }}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  className="submit-reason-btn reject-btn"
                  onClick={handleInvalidDocument}
                  disabled={!invalidDocReason.trim() || processing}
                  style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
                >
                  {processing ? 'Processing...' : 'Mark as Invalid & Notify Patient'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* View Health Reports Modal */}
      {showHealthReportsModal && currentUser && (
        <div className="reason-modal">
          <div className="reason-modal-content health-reports-modal">
            <div className="reason-header">
              <h3>Health Reports - {currentUser?.name} {currentUser?.surname}</h3>
              <button 
                className="close-modal" 
                onClick={() => setShowHealthReportsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="reason-container">
              {loadingReports ? (
                <div className="text-center p-4">
                  <Spinner animation="border" role="status" variant="primary">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : healthReports.length > 0 ? (
                <>
                  <p className="mb-3">This user has submitted the following health reports:</p>
                  <div className="health-reports-documents-container">
                    {healthReports.map((report, index) => {
                      const reportUrl = report.report_path?.startsWith('http') 
                        ? report.report_path 
                        : `${API_BASE_URL}/uploads/${(report.report_path || '').replace(/^\/+/, '')}`;
                      const downloadUrl = reportUrl + (reportUrl.includes('?') ? '&' : '?') + 'download=true';
                      const ext = (report.report_path || '').split('.').pop()?.toLowerCase();
                      const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(ext);
                      return (
                        <div 
                          key={report.id} 
                          className={`health-report-document-frame ${report.status === 'invalid' || report.status === 'rejected' ? 'invalid-report-item' : ''}`}
                        >
                          <h4>Report #{index + 1}</h4>
                          <span className="health-report-date-small">Submitted: {formatDate(report.created_at)}</span>
                          <div className="health-report-preview">
                            {isImage ? (
                              <img src={reportUrl} alt={`Report ${index + 1}`} />
                            ) : (
                              <iframe src={reportUrl} title={`Report ${index + 1}`} />
                            )}
                          </div>
                          <div className="health-report-action-buttons">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => window.open(reportUrl, '_blank')}
                            >
                              Open in new tab
                            </Button>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => window.open(downloadUrl, '_blank')}
                            >
                              <FaFileDownload className="me-1" /> Download
                            </Button>
                            {report.status !== 'invalid' && report.status !== 'rejected' ? (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => showInvalidDocumentModal(report)}
                                disabled={(currentUser?.health_report_request_count || 0) >= 3}
                                title={(currentUser?.health_report_request_count || 0) >= 3 ? "Maximum report request limit (3/3) reached." : ""}
                              >
                                <span role="img" aria-label="Invalid">✕</span> Mark Invalid
                              </Button>
                            ) : (
                              <Badge bg="secondary" className="align-self-center">Marked Invalid</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <Alert variant="info">
                  No health reports found for this user. If they were recently requested, the user may not have uploaded them yet.
                </Alert>
              )}
              <div className="reason-actions">
                <button
                  className="cancel-reason-btn"
                  onClick={() => setShowHealthReportsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthReviewQueue;
