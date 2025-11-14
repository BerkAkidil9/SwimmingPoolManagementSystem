import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaUpload, FaFileUpload, FaExclamationTriangle, FaCheck } from 'react-icons/fa';
import axios from 'axios';
import './HealthReportUpload.css';

const HealthReportUpload = () => {
  const { userId: paramsUserId } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryUserId = queryParams.get('userId');
  
  // Use userId from either the URL params or query params
  const userId = paramsUserId || queryUserId;
  
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isReminderFlow, setIsReminderFlow] = useState(!!queryUserId);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        // Get user information to display the name and health status reason
        const response = await axios.get(`/api/member/user/${userId}`);
        setUser(response.data);
        setError(null);
      } catch (err) {
        setError('Error loading user information: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError(null);

    // Create preview for image files
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, JPG, and PNG files are accepted');
      return;
    }

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('report', file);

      await axios.post(`/api/doctor/upload-health-report/${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(true);
      setFile(null);
      setPreview(null);
    } catch (err) {
      setError('Error uploading file: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading user information...</p>
      </Container>
    );
  }

  if (success) {
    return (
      <Container className="health-report-upload mt-5">
        <Card className="success-card">
          <Card.Body className="text-center py-5">
            <div className="success-icon">
              <FaCheck color="white" size={40} />
            </div>
            <h2>Health Report Submitted Successfully</h2>
            <p className="mt-3">Thank you for submitting your health report. Our medical team will review it as soon as possible.</p>
            <p>You will be notified via email once the review is complete.</p>
            <Button variant="primary" onClick={() => navigate('/dashboard')} className="mt-4 px-4 py-2">
              Go to Dashboard
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="health-report-upload mt-5">
        <Alert variant="danger">
          <FaExclamationTriangle className="me-2" />
          User not found or you don't have permission to upload a health report for this user.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="health-report-upload mt-5">
      <Card>
        <Card.Header>
          <h2><FaFileUpload className="me-2" /> Upload Health Report</h2>
        </Card.Header>
        <Card.Body>
          <div className="user-info mb-4">
            <h4>Health Report Request for {user.name} {user.surname}</h4>
            <Alert variant="info">
              <p><strong>Reason for Additional Documentation:</strong></p>
              <p>{user.health_status_reason || 'Our medical team has requested additional health documentation to complete your assessment.'}</p>
            </Alert>
          </div>

          {error && (
            <Alert variant="danger">{error}</Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4">
              <Form.Label className="required-field">Health Document</Form.Label>
              <div className="file-upload-container">
                <div className={`file-upload-area ${file ? 'has-file' : ''}`}>
                  <input
                    type="file"
                    id="health-report"
                    onChange={handleFileChange}
                    className="file-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div className="file-upload-content">
                    {!file ? (
                      <>
                        <FaUpload className="upload-icon" />
                        <p>Drag your file here or click to browse</p>
                        <p className="file-types">Accepted formats: PDF, JPG, PNG (Max: 10MB)</p>
                      </>
                    ) : (
                      <>
                        <div className="selected-file">
                          <strong>Selected File:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                        {preview && (
                          <div className="image-preview mt-3">
                            <img src={preview} alt="Document preview" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Form.Group>

            <div className="important-notice mb-4">
              <h5><FaExclamationTriangle className="me-2" /> Important</h5>
              <ul>
                <li>Only upload documents requested by our medical team</li>
                <li>Ensure documents are clear and readable</li>
                <li>Personal health information will be kept confidential</li>
                <li>You will be notified by email once your document is reviewed</li>
              </ul>
            </div>

            <div className="d-grid">
              <Button 
                variant="primary" 
                type="submit" 
                size="lg" 
                disabled={!file || uploading}
              >
                {uploading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                    <span className="ms-2">Uploading...</span>
                  </>
                ) : (
                  <>
                    <FaFileUpload className="me-2" />
                    Submit Health Report
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default HealthReportUpload;
