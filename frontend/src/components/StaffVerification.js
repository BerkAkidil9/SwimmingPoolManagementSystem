import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QrReader from 'react-qr-scanner';
import Navbar from './Navbar/Navbar';
import './StaffVerification.css';

const StaffVerification = () => {
  const [qrData, setQrData] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [scannerFacingMode, setScannerFacingMode] = useState('environment'); // rear camera by default

  // Get user information from session storage
  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserInfo(user);
      console.log('Staff verification portal - User info:', user);
    }
  }, []);

  const handleQrInput = (e) => {
    setQrData(e.target.value);
    try {
      const parsed = JSON.parse(e.target.value);
      setParsedData(parsed);
      setVerificationResult(null); // Reset previous verification
    } catch (err) {
      setParsedData(null);
    }
  };
  
  const handleScan = (data) => {
    if (data && data.text) {
      // Temporarily disable scanner after successful scan
      setScannerEnabled(false);
      
      try {
        const parsed = JSON.parse(data.text);
        setQrData(data.text);
        setParsedData(parsed);
        setVerificationResult(null); // Reset previous verification
        
        // Auto-verify after scan
        setTimeout(() => {
          verifyQrCode(parsed);
        }, 500);
      } catch (err) {
        console.error('QR scan parse error:', err);
      }
    }
  };
  
  const handleScanError = (err) => {
    console.error('QR scan error:', err);
  };
  
  const resetScanner = () => {
    setParsedData(null);
    setVerificationResult(null);
    setQrData('');
    setScannerEnabled(true);
  };
  
  const toggleCamera = () => {
    setScannerFacingMode(scannerFacingMode === 'environment' ? 'user' : 'environment');
  };

  const verifyQrCode = async (dataToVerify = null) => {
    const dataForVerification = dataToVerify || parsedData;
    if (!dataForVerification) return;
    
    setIsLoading(true);
    console.log('QR verification - Sending data to backend:', dataForVerification);
    
    try {
      // Make API call to backend for QR verification with anti-reuse protection
      const response = await axios.post('/api/staff/verify-qr-code', {
        qrData: dataForVerification
      }, {
        withCredentials: true
      });
      
      console.log('QR verification response:', response.data);
      
      if (response.data.status === 'valid') {
        setVerificationResult({
          status: 'valid',
          message: response.data.message || 'Member verification successful',
          memberDetails: response.data.memberDetails
        });
      } else {
        // This branch shouldn't be reached normally as errors throw to catch block
        // But adding as a fallback
        setVerificationResult({
          status: 'invalid',
          message: response.data.message || 'Invalid QR code',
          reasons: [response.data.error || 'Unknown error']
        });
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('QR verification error:', err);
      console.error('Full error object:', JSON.stringify(err, null, 2));
      console.error('Error response data:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      // Extract error message from response if available
      const errorResponse = err.response?.data;
      const errorMessage = errorResponse?.error || 'Error during verification';
      const errorStatus = errorResponse?.status || 'invalid';
      const errorDetails = errorResponse?.details || {};
      console.log('Parsed error details:', { errorMessage, errorStatus, errorDetails });
      

      
      // Special handling for already used QR codes
      if (errorMessage.includes('already been used')) {
        let usedDate = errorDetails.verifiedAt ? new Date(errorDetails.verifiedAt) : null;
        
        // Manually adjust for Turkish time (UTC+3)
        if (usedDate) {
          // Add 3 hours to match Turkish time
          usedDate.setHours(usedDate.getHours() + 3);
          
          // Format using the adjusted date
          const day = usedDate.getDate().toString().padStart(2, '0');
          const month = (usedDate.getMonth() + 1).toString().padStart(2, '0');
          const year = usedDate.getFullYear();
          const hours = usedDate.getHours().toString().padStart(2, '0');
          const minutes = usedDate.getMinutes().toString().padStart(2, '0');
          const seconds = usedDate.getSeconds().toString().padStart(2, '0');
          
          // Format as DD.MM.YYYY HH:MM:SS
          const formattedDate = `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
          
          setVerificationResult({
            status: 'invalid',
            message: 'This QR code has already been used',
            reasons: [`This QR code was already verified at ${formattedDate}`]
          });
        } else {
          setVerificationResult({
            status: 'invalid',
            message: 'This QR code has already been used',
            reasons: ['This QR code was previously verified']
          });
        }
      
      } else {
        // Handle other error cases
        setVerificationResult({
          status: errorStatus,
          message: 'Invalid or expired QR code',
          reasons: [errorMessage]
        });
      }
      
      setIsLoading(false);
    }
  };







  return (
    <div className="staff-verification-wrapper">
      <Navbar />
      <div className="staff-verification-container">
        <h2 className="staff-page-title">Pool Staff Verification Portal</h2>
        
        <div className="verification-area">
        <div className="qr-input-section">
          <h3>Scan Member QR Code</h3>
          
          {scannerEnabled ? (
            <div className="scanner-container">
              <QrReader
                delay={300}
                onError={handleScanError}
                onScan={handleScan}
                style={{ width: '100%' }}
                constraints={{
                  video: { facingMode: scannerFacingMode }
                }}
              />
              <div className="scanner-controls">
                <button onClick={toggleCamera} className="camera-toggle-btn">
                  Switch Camera
                </button>
              </div>
              <p className="scan-instructions">Hold a QR code in front of the camera to scan</p>
            </div>
          ) : (
            <div className="manual-input-section">
              <p className="staff-info">QR code detected! Verifying...</p>
              <button onClick={resetScanner} className="reset-btn">
                Reset Scanner
              </button>
            </div>
          )}
          

        </div>
        
        {parsedData && (
          <div className="member-data-display">
            <h3>Member Information</h3>
            <div className="member-info-grid">
              <div className="info-item">
                <span className="info-label">Reservation ID:</span>
                <span className="info-value">{parsedData.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Name:</span>
                <span className="info-value">{parsedData.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Membership ID:</span>
                <span className="info-value">{parsedData.membershipId}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Pool:</span>
                <span className="info-value">{parsedData.poolName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Date:</span>
                <span className="info-value">{parsedData.date}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Time Slot:</span>
                <span className="info-value">{parsedData.time}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Check-in Code:</span>
                <span className="info-value">{parsedData.checkInCode}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {verificationResult && (
        <div className={`verification-result ${verificationResult.status}`}>
          <h3>{verificationResult.message}</h3>
          
          {verificationResult.status === 'valid' && (
            <div className="valid-member-details">
              <p><strong>{verificationResult.memberDetails.name}</strong> is authorized for {verificationResult.memberDetails.sessionType}</p>
              <p>Session time: {verificationResult.memberDetails.startTime} to {verificationResult.memberDetails.endTime}</p>
              <div className="verification-success">
                <p className="success-message">✓ Member successfully verified</p>
              </div>
            </div>
          )}
          
          {verificationResult.status === 'invalid' && (
            <div className="verification-errors">
              <p>The following issues were found:</p>
              <ul>
                {verificationResult.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          
          {verificationResult.status === 'error' && (
            <p>A system error occurred during verification. Please try again.</p>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default StaffVerification;
