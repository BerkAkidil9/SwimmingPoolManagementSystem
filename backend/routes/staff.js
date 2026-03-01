const express = require("express");
const db = require("../config/database");
const { isStaff, getCurrentUser, getCurrentUserId } = require("../middleware/auth");
const router = express.Router();

// Staff route middleware - protects all staff routes
router.use(isStaff);

// Get staff dashboard data (can be expanded later with staff-specific functionality)
router.get("/dashboard", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    res.json({
      success: true,
      staffInfo: {
        id: user?.id,
        name: user?.name,
        email: user?.email
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
    
    const MAX_QR_LENGTH = 2000;
    if (typeof qrData !== 'string' || qrData.length > MAX_QR_LENGTH) {
      return res.status(400).json({ error: "Invalid QR code data" });
    }
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (err) {
      return res.status(400).json({ error: "Invalid QR code format" });
    }
    if (parsedData === null || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
      return res.status(400).json({ error: "Invalid QR code structure" });
    }
    const reservationId = parsedData.id != null ? Number(parsedData.id) : NaN;
    const checkInCode = typeof parsedData.checkInCode === 'string' ? parsedData.checkInCode.trim() : '';
    if (!Number.isInteger(reservationId) || reservationId <= 0 || !checkInCode || checkInCode.length > 200) {
      return res.status(400).json({ error: "Missing or invalid required QR code information" });
    }
    const membershipId = parsedData.membershipId;
    const date = parsedData.date;
    const time = parsedData.time;
    console.log("QR Verification API - Extracted fields:", { reservationId, checkInCode, membershipId, date, time });
    
    const result = await db.transaction(async (trx) => {
      const [existingVerifications] = await trx.query(
        "SELECT * FROM qr_code_verifications WHERE check_in_code = ?",
        [checkInCode]
      );
      
      if (existingVerifications.length > 0) {
        const err = new Error("This QR code has already been used");
        err.statusCode = 400;
        err.verifiedAt = existingVerifications[0].verified_at;
        throw err;
      }
      
      const [reservations] = await trx.query(
        `SELECT r.*, s.session_date, s.start_time, s.end_time, s.type, p.name as pool_name,
         u.name as user_name, u.surname as user_surname
         FROM reservations r
         JOIN sessions s ON r.session_id = s.id
         JOIN "Pools" p ON s.pool_id = p.id
         JOIN users u ON r.user_id = u.id
         WHERE r.id = ? AND r.status = 'completed'`,
        [reservationId]
      );
      
      if (reservations.length === 0) {
        const err = new Error("Reservation not found or not checked in");
        err.statusCode = 404;
        throw err;
      }
      
      const reservation = reservations[0];
      
      const isValidCheckInCode = checkInCode.startsWith(`${reservationId}-`);
      if (!isValidCheckInCode) {
        const err = new Error("Invalid check-in code format");
        err.statusCode = 400;
        throw err;
      }
      
      // Session times are stored as Turkey local time (Europe/Istanbul, UTC+3)
      const dateStr = typeof reservation.session_date === 'string'
        ? reservation.session_date.split('T')[0]
        : reservation.session_date.toISOString().split('T')[0];
      const [hours, minutes] = reservation.end_time.split(':').map(Number);
      const sessionEnd = new Date(
        `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}+03:00`
      );
      const sessionDate = new Date(dateStr);
      const now = new Date();
      
      if (now > sessionEnd) {
        const err = new Error("Session has already ended");
        err.statusCode = 400;
        throw err;
      }
      
      const staffId = getCurrentUserId(req);
      
      await trx.query(
        "INSERT INTO qr_code_verifications (reservation_id, check_in_code, verified_by) VALUES (?, ?, ?)",
        [reservationId, checkInCode, staffId]
      );
      
      return {
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
      };
    });

    return res.json(result);
  } catch (err) {
    if (err.statusCode) {
      const body = { status: 'invalid', error: err.message };
      if (err.verifiedAt) body.details = { verifiedAt: err.verifiedAt };
      return res.status(err.statusCode).json(body);
    }
    console.error("QR verification error:", err);
    res.status(500).json({ error: "An internal error occurred during verification." });
  }
});

module.exports = router;
