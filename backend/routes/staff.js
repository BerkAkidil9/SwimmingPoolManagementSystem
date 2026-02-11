const express = require("express");
const db = require("../config/database");
const router = express.Router();

// Staff route middleware - protects all staff routes
router.use((req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'staff') {
    return res.status(403).json({ error: "Access denied. Staff authorization required." });
  }
  next();
});

// Get staff dashboard data (can be expanded later with staff-specific functionality)
router.get("/dashboard", async (req, res) => {
  try {
    // Return basic staff info
    res.json({
      success: true,
      staffInfo: {
        id: req.session.user.id,
        name: req.session.user.name,
        email: req.session.user.email
      }
    });
  } catch (err) {
    console.error("Staff dashboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Verify QR code - this endpoint handles the verification and prevents reuse
router.post("/verify-qr-code", async (req, res) => {
  try {
    console.log("QR Verification API - Request body:", req.body);
    const { qrData } = req.body;
    
    if (!qrData) {
      console.log("QR Verification API - Error: QR code data is missing");
      return res.status(400).json({ error: "QR code data is required" });
    }
    
    // Parse the QR data
    let parsedData;
    try {
      parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
      console.log("QR Verification API - Parsed data:", parsedData);
    } catch (err) {
      console.log("QR Verification API - Error parsing QR data:", err.message);
      return res.status(400).json({ error: "Invalid QR code format" });
    }
    
    // Extract needed information from QR code
    const { id: reservationId, checkInCode, membershipId, date, time } = parsedData;
    console.log("QR Verification API - Extracted fields:", { reservationId, checkInCode, membershipId, date, time });
    
    if (!reservationId || !checkInCode) {
      console.log("QR Verification API - Error: Missing required fields");
      return res.status(400).json({ error: "Missing required QR code information" });
    }
    
    // Start a transaction for data consistency
    await db.promise().beginTransaction();
    
    try {
      // Check if the QR code has already been verified
      console.log("QR Verification API - Checking for existing verifications for code:", checkInCode);
      
      const [existingVerifications] = await db.promise().query(
        "SELECT * FROM qr_code_verifications WHERE check_in_code = ?",
        [checkInCode]
      );
      console.log("QR Verification API - Existing verifications found:", existingVerifications.length);
      
      if (existingVerifications.length > 0) {
        await db.promise().rollback();
        return res.status(400).json({
          status: 'invalid',
          error: "This QR code has already been used",
          details: {
            verifiedAt: existingVerifications[0].verified_at
          }
        });
      }
      
      // Verify the reservation exists and matches the QR code
      console.log("QR Verification API - Checking reservation details for ID:", reservationId);
      
      const [reservations] = await db.promise().query(
        `SELECT r.*, s.session_date, s.start_time, s.end_time, s.type, p.name as pool_name,
         u.name as user_name, u.surname as user_surname
         FROM reservations r
         JOIN sessions s ON r.session_id = s.id
         JOIN Pools p ON s.pool_id = p.id
         JOIN users u ON r.user_id = u.id
         WHERE r.id = ? AND r.status = 'completed'`,
        [reservationId]
      );
      console.log("QR Verification API - Reservation found:", reservations.length > 0);
      
      if (reservations.length === 0) {
        await db.promise().rollback();
        return res.status(404).json({
          status: 'invalid',
          error: "Reservation not found or not checked in"
        });
      }
      
      const reservation = reservations[0];
      
      // Check if the check-in code follows the expected format
      const isValidCheckInCode = checkInCode.startsWith(`${reservationId}-`);
      if (!isValidCheckInCode) {
        await db.promise().rollback();
        return res.status(400).json({
          status: 'invalid',
          error: "Invalid check-in code format"
        });
      }
      
      // Additional verification logic to check if the session is still valid
      const sessionDate = new Date(reservation.session_date);
      const sessionEnd = new Date(sessionDate);
      const [hours, minutes] = reservation.end_time.split(':').map(Number);
      sessionEnd.setHours(hours, minutes, 0);
      
      const now = new Date();
      
      if (now > sessionEnd) {
        await db.promise().rollback();
        return res.status(400).json({
          status: 'invalid',
          error: "Session has already ended"
        });
      }
      
      // All verification passed, record the verification to prevent reuse
      const staffId = req.session.user.id;
      
      await db.promise().query(
        "INSERT INTO qr_code_verifications (reservation_id, check_in_code, verified_by) VALUES (?, ?, ?)",
        [reservationId, checkInCode, staffId]
      );
      
      // Commit the transaction
      await db.promise().commit();
      
      // Return success response with member and session details
      return res.json({
        status: 'valid',
        message: "QR code verified successfully",
        memberDetails: {
          name: `${reservation.user_name} ${reservation.user_surname}`,
          membership: membershipId,
          sessionType: reservation.type,
          startTime: reservation.start_time,
          endTime: reservation.end_time
        },
        sessionDetails: {
          id: reservation.session_id,
          poolName: reservation.pool_name,
          date: sessionDate.toISOString().split('T')[0]
        }
      });
      
    } catch (error) {
      console.error("QR Verification API - Transaction error:", error);
      await db.promise().rollback();
      throw error; // Pass to outer catch block
    }
  } catch (err) {
    console.error("QR verification error:", err.message);
    console.error("Full error stack:", err.stack);
    res.status(500).json({ error: `Server error during verification: ${err.message}` });
  }
});

module.exports = router;
