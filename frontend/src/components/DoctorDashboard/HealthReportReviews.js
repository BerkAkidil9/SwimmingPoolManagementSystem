import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { FaFile, FaFilePdf, FaFileImage, FaFileAlt, FaSearch, FaUser, FaCalendarAlt, FaEye, FaCheck, FaTimes } from 'react-icons/fa';
import axios from 'axios';

const HealthReportReviews = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/doctor/users-with-reports');
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

  const fetchUserReports = async (userId) => {
    try {
      setLoadingReports(true);
      const response = await axios.get(`/api/doctor/health-reports/${userId}`);
      setReports(response.data);
    } catch (err) {
      setError('Error fetching reports: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingReports(false);
    }
  };

  const handleViewReports = (user) => {
    setCurrentUser(user);
    fetchUserReports(user.id);
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const handleApproveReport = async () => {
    if (!selectedReport) return;
    
    try {
      setProcessing(true);
      await axios.put(`/api/doctor/health-reports/${selectedReport.id}`, {
        status: 'approved',
        doctor_notes: doctorNotes
      });
      
      // Close modal and reset state
      setShowReportModal(false);
      setDoctorNotes('');
      
      // Refresh reports list
      fetchUserReports(currentUser.id);
      // Refresh users list
      fetchUsers();
    } catch (err) {
      setError('Error approving report: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectReport = async () => {
    if (!selectedReport) return;
    if (!doctorNotes.trim()) {
      setError('Doctor notes are required when rejecting a health report');
      return;
    }
    
    try {
      setProcessing(true);
      await axios.put(`/api/doctor/health-reports/${selectedReport.id}`, {
        status: 'rejected',
        doctor_notes: doctorNotes
      });
      
      // Close modal and reset state
      setShowReportModal(false);
      setDoctorNotes('');
      
      // Refresh reports list
      fetchUserReports(currentUser.id);
      // Refresh users list
      fetchUsers();
    } catch (err) {
      setError('Error rejecting report: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchTermLower) ||
      user.surname.toLowerCase().includes(searchTermLower) ||
      user.email.toLowerCase().includes(searchTermLower) ||
      `${user.name} ${user.surname}`.toLowerCase().includes(searchTermLower)
    );
  });

  const getFileIcon = (filePath) => {
    if (!filePath) return <FaFileAlt />;
    
    const extension = filePath.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FaFilePdf />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <FaFileImage />;
      default:
        return <FaFile />;
    }
  };

  return (
    <div className="health-report-reviews">
      <Card className="panel-card">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="text-dark"><FaFileAlt className="me-2" /> Health Reports</h3>
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
              <FaFileAlt />
              <h4 className="text-dark">No health reports pending review</h4>
              <p className="text-muted">When users submit health reports, they will appear here for your review.</p>
            </div>
          ) : (
            <Row xs={1} md={currentUser ? 1 : 2} className="g-4">
              {!currentUser ? (
                // Show all users with pending reports
                filteredUsers.map((user) => (
                  <Col key={user.id}>
                    <Card className="health-review-card">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h4 className="text-dark"><FaUser className="me-2" /> {user.name} {user.surname}</h4>
                            <p className="text-muted mb-0">
                              Email: {user.email} | DOB: {new Date(user.date_of_birth).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className="health-status-badge status-needs-report">Report Requested</Badge>
                        </div>
                        <div className="mt-3">
                          <Button 
                            variant="primary" 
                            onClick={() => handleViewReports(user)}
                          >
                            View Health Reports
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))
              ) : (
                // Show reports for the selected user
                <Col>
                  <Card className="health-review-card">
                    <Card.Header>
                      <div className="d-flex justify-content-between align-items-center">
                        <h4 className="text-dark"><FaUser className="me-2" /> Health Reports for {currentUser.name} {currentUser.surname}</h4>
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => {
                            setCurrentUser(null);
                            setReports([]);
                          }}
                        >
                          Back to Users
                        </Button>
                      </div>
                    </Card.Header>
                    <Card.Body>
                      {loadingReports ? (
                        <div className="text-center py-3">
                          <Spinner animation="border" role="status" size="sm" variant="primary">
                            <span className="visually-hidden">Loading...</span>
                          </Spinner>
                          <p className="mt-2 text-dark">Loading reports...</p>
                        </div>
                      ) : reports.length === 0 ? (
                        <div className="alert alert-info">No health reports found for this user.</div>
                      ) : (
                        <>
                          {reports.map((report) => (
                            <div key={report.id} className="health-report-document">
                              {getFileIcon(report.report_path)}
                              <div className="report-info">
                                <div className="text-dark">Health Report #{report.id}</div>
                                <div className="report-date text-muted">
                                  <FaCalendarAlt /> Submitted: {new Date(report.created_at).toLocaleString()}
                                </div>
                              </div>
                              <Badge 
                                className={`health-report-status report-status-${report.status}`}
                              >
                                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                              </Badge>
                              <div className="report-action-buttons">
                                <Button 
                                  variant="primary" 
                                  size="sm"
                                  onClick={() => handleViewReport(report)}
                                >
                                  <FaEye /> View
                                </Button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          )}
        </Card.Body>
      </Card>

      {/* Modal for viewing and acting on the report */}
      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="text-dark">
            Health Report Review
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <>
              <div className="mb-4">
                <h5 className="text-dark">Report Details</h5>
                <p className="text-muted"><strong>Submitted:</strong> {new Date(selectedReport.created_at).toLocaleString()}</p>
                <p className="text-muted"><strong>Status:</strong> {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}</p>
                
                <div className="report-preview mt-3 mb-4">
                  <h5 className="text-dark">Report Document</h5>
                  <div className="text-center p-3 border">
                    <a 
                      href={`/${selectedReport.report_path}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary"
                    >
                      <FaEye className="me-2" /> View Full Document
                    </a>
                  </div>
                </div>
                
                <Form.Group className="mb-3">
                  <Form.Label className="text-dark">Doctor Notes</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={4} 
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="Enter your assessment of this health report..."
                  />
                  <Form.Text className="text-muted">
                    Notes are required when rejecting a report. They will be sent to the user.
                  </Form.Text>
                </Form.Group>
              </div>
              
              <div className="d-flex justify-content-end">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowReportModal(false)} 
                  className="me-2"
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleRejectReport}
                  className="me-2"
                  disabled={processing || !doctorNotes.trim()}
                >
                  {processing ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      <span className="ms-2">Processing...</span>
                    </>
                  ) : (
                    <><FaTimes className="me-1" /> Reject Report</>
                  )}
                </Button>
                <Button 
                  variant="success" 
                  onClick={handleApproveReport}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      <span className="ms-2">Processing...</span>
                    </>
                  ) : (
                    <><FaCheck className="me-1" /> Approve Health Status</>
                  )}
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default HealthReportReviews;
