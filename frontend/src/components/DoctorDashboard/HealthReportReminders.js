import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Badge, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { FaBell, FaEnvelope, FaExclamationTriangle, FaCalendarAlt, FaClock } from 'react-icons/fa';
import axios from 'axios';
import { formatWithTurkishTime } from '../../utils/dateUtils';
import './HealthReportReminders.css';

const HealthReportReminders = () => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingReminders, setPendingReminders] = useState([]);
  const [reminderHistory, setReminderHistory] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedPatients, setSelectedPatients] = useState({});

  useEffect(() => {
    fetchPendingReminders();
  }, []);

  const fetchPendingReminders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get patients who need report reminders
      const response = await axios.get('/api/doctor/pending-health-report-reminders');
      setPendingReminders(response.data.pendingReminders || []);
      setReminderHistory(response.data.reminderHistory || []);
    } catch (err) {
      setError('Error fetching pending reminders: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Toggle patient selection
  const togglePatientSelection = (patientId) => {
    setSelectedPatients(prev => {
      const newSelection = {...prev};
      if (newSelection[patientId]) {
        delete newSelection[patientId];
      } else {
        newSelection[patientId] = true;
      }
      return newSelection;
    });
  };
  
  // Select or deselect all patients
  const toggleSelectAll = () => {
    if (Object.keys(selectedPatients).length === pendingReminders.length) {
      // If all are selected, deselect all
      setSelectedPatients({});
    } else {
      // Otherwise, select all
      const allSelected = {};
      pendingReminders.forEach(patient => {
        allSelected[patient.id] = true;
      });
      setSelectedPatients(allSelected);
    }
  };

  // We're removing the automatic reminder button since it will happen via cron job
  // Only keeping the manual selection functionality
  
  // Send reminders to selected patients only
  const sendRemindersToSelected = async () => {
    const selectedIds = Object.keys(selectedPatients).map(id => parseInt(id));
    
    if (selectedIds.length === 0) {
      setError('Please select at least one patient to send reminders');
      return;
    }
    
    try {
      setSending(true);
      setError(null);
      setSuccess(null);
      
      const response = await axios.post('/api/reminders/send-specific-reminders', {
        userIds: selectedIds
      });
      
      // Check if remindersSent exists in the response
      const sentCount = response.data.remindersSent && 
                        Array.isArray(response.data.remindersSent) ? 
                        response.data.remindersSent.filter(r => r.status === 'sent').length : 0;
      
      setSuccess(`Successfully sent ${sentCount} reminders to selected patients.`);
      
      // Refresh the pending reminders list
      fetchPendingReminders();
      // Clear selections
      setSelectedPatients({});
    } catch (err) {
      setError('Error sending reminders: ' + (err.response?.data?.error || err.message));
    } finally {
      setSending(false);
    }
  };

  // The backend now provides the properly formatted dates and days calculation
  // No need for client-side date formatting or calculations

  return (
    <div className="health-report-reminders">
      <h2 className="mb-4 text-dark">
        <FaBell className="me-2" />
        Health Report Reminders
      </h2>
      
      {error && (
        <Alert variant="danger" className="mb-4">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" className="mb-4">
          <FaEnvelope className="me-2" />
          {success}
        </Alert>
      )}
      
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h3 className="mb-0 text-dark">Pending Reminders</h3>
              <div>
                <Button 
                  variant="success" 
                  onClick={sendRemindersToSelected} 
                  disabled={sending || Object.keys(selectedPatients).length === 0}
                >
                  {sending ? (
                    <>
                      <Spinner 
                        as="span" 
                        animation="border" 
                        size="sm" 
                        role="status" 
                        aria-hidden="true" 
                        className="me-2"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FaEnvelope className="me-2" />
                      Send Reminders to Selected ({Object.keys(selectedPatients).length})
                    </>
                  )}
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" role="status" variant="primary">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                  <p className="mt-2">Loading pending reminders...</p>
                </div>
              ) : pendingReminders.length === 0 ? (
                <div className="text-center py-4">
                  <FaBell size={32} className="text-muted mb-3" />
                  <h5>No pending reminders</h5>
                  <p className="text-muted">
                    All patients have either uploaded their health reports or haven't reached the 5-day reminder threshold.
                  </p>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr className="text-dark">
                      <th>
                        <div className="d-flex align-items-center">
                          <input 
                            type="checkbox" 
                            className="me-2" 
                            checked={Object.keys(selectedPatients).length === pendingReminders.length && pendingReminders.length > 0}
                            onChange={toggleSelectAll}
                          />
                          Select
                        </div>
                      </th>
                      <th>Patient</th>
                      <th>Report Requested</th>
                      <th>Days Until Reminder</th>
                      <th>Report Requested Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReminders.map(patient => (
                      <tr key={patient.id}>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={!!selectedPatients[patient.id]} 
                            onChange={() => togglePatientSelection(patient.id)}
                          />
                        </td>
                        <td>
                          <strong className="text-dark">{patient.name} {patient.surname}</strong>
                          <div className="text-muted small">{patient.email}</div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <FaCalendarAlt className="me-2 text-primary" /> 
                            {patient.health_report_requested_at_formatted}
                          </div>
                        </td>
                        <td>
                          {patient.days_until_reminder <= 0 ? (
                            <Badge bg="warning" className="py-2 px-3">
                              <FaClock className="me-1" /> Ready to send
                            </Badge>
                          ) : (
                            <Badge bg="info" className="py-2 px-3">
                              <FaClock className="me-1" /> 
                              {patient.days_until_reminder} days until reminder
                            </Badge>
                          )}
                        </td>
                        <td className="text-dark">
                          {patient.health_status_reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h3 className="mb-0 text-dark">Reminder History</h3>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" role="status" variant="primary">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                  <p className="mt-2">Loading reminder history...</p>
                </div>
              ) : reminderHistory.length === 0 ? (
                <div className="text-center py-4">
                  <FaEnvelope size={32} className="text-muted mb-3" />
                  <h5>No reminder history</h5>
                  <p className="text-muted">
                    No reminder emails have been sent yet.
                  </p>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr className="text-dark">
                      <th>Patient</th>
                      <th>Reminder Sent</th>
                      <th>Report Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reminderHistory.map(patient => (
                      <tr key={patient.id}>
                        <td>
                          <strong className="text-dark">{patient.name} {patient.surname}</strong>
                          <div className="text-muted small">{patient.email}</div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <FaCalendarAlt className="me-2 text-success" /> 
                            {patient.health_report_reminder_sent_at_formatted}
                          </div>
                        </td>
                        <td>
                          {patient.has_uploaded_report ? (
                            <Badge bg="success" className="py-2 px-3">
                              Report Uploaded
                            </Badge>
                          ) : (
                            <Badge bg="warning" className="py-2 px-3">
                              Pending Upload
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HealthReportReminders;
