const express = require("express");
const router = express.Router();
const db = require("../config/database");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine destination based on fieldname
    const dest = file.fieldname === 'idCard' ? 'uploads/id_cards' : 'uploads/profile_photos';
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Create unique filename with user id and timestamp
    const userId = req.session.user.id;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${timestamp}${ext}`);
  }
});

// Initialize multer with storage configuration
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized access" });
  }
  next();
};

// Get user by ID (for health report upload)
// This endpoint is public since it needs to be accessed from email links
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Only return essential information for the health report upload screen
    const [userRows] = await db.promise().query(
      "SELECT id, name, surname, email, health_status, health_status_reason FROM users WHERE id = ?",
      [userId]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(userRows[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Error fetching user information" });
  }
});

// Get member's package information
router.get("/package", isAuthenticated, async (req, res) => {
  try {
    const [packageInfo] = await db.promise().query(
      "SELECT * FROM packages WHERE user_id = ? AND remaining_sessions > 0 AND expiry_date >= CURDATE() ORDER BY created_at DESC LIMIT 1",
      [req.session.user.id]
    );
    res.json(packageInfo[0] || null);
  } catch (error) {
    console.error("Error fetching package:", error);
    res.status(500).json({ error: "Error fetching package information" });
  }
});

// Purchase a package
router.post("/packages", isAuthenticated, async (req, res) => {
  const { type } = req.body;
  
  try {
    // Check for active packages only (both remaining sessions > 0 AND not expired)
    const [existingPackage] = await db.promise().query(
      "SELECT * FROM packages WHERE user_id = ? AND remaining_sessions > 0 AND expiry_date >= CURDATE()",
      [req.session.user.id]
    );

    if (existingPackage.length) {
      return res.status(400).json({ error: "You already have an active package" });
    }

    const sessions = type === 'education' ? 12 : 18;
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 3);

    // Calculate price based on package type
    const price = type === 'education' ? 100.00 : 150.00;

    await db.promise().query(
      "INSERT INTO packages (user_id, type, price, remaining_sessions, expiry_date) VALUES (?, ?, ?, ?, ?)",
      [req.session.user.id, type, price, sessions, expiryDate]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error purchasing package:", error);
    res.status(500).json({ error: "Error purchasing package" });
  }
});

// Get member's reservations
router.get("/reservations", isAuthenticated, async (req, res) => {
  try {
    // Begin transaction for safety
    await db.promise().beginTransaction();
    
    // Get current time in Turkey's timezone
    const [currentTime] = await db.promise().query(
      "SELECT CONVERT_TZ(NOW(), '+00:00', '+03:00') as now"
    );
    const now = currentTime[0].now;
    
    // Find expired reservations for this user and mark them as "missed"
    await db.promise().query(
      `UPDATE reservations r
       JOIN sessions s ON r.session_id = s.id
       SET r.status = 'missed'
       WHERE r.user_id = ?
       AND (r.status IS NULL OR r.status = 'active')
       AND CONCAT(s.session_date, ' ', s.end_time) < ?`,
      [req.session.user.id, now]
    );
    
    await db.promise().commit();

    // Get active reservations (excluding missed, completed, and canceled)
    const [reservations] = await db.promise().query(
      `SELECT r.*, p.name as poolName, s.type, s.session_date, s.start_time, s.end_time 
       FROM reservations r 
       JOIN sessions s ON r.session_id = s.id 
       JOIN Pools p ON s.pool_id = p.id 
       WHERE r.user_id = ? AND (r.status IS NULL OR (r.status != 'canceled' AND r.status != 'completed' AND r.status != 'missed'))
       ORDER BY s.session_date, s.start_time`,
      [req.session.user.id]
    );

    res.json(reservations);
  } catch (error) {
    // Rollback if there's an error
    await db.promise().rollback();
    console.error("Error fetching reservations:", error);
    res.status(500).json({ error: "Error fetching reservations" });
  }
});

// Get sessions for a specific pool - fix date conversion issue
router.get("/pools/:poolId/sessions", isAuthenticated, async (req, res) => {
  const { poolId } = req.params;
  const userId = req.session.user.id;
  
  try {
    console.log(`Getting sessions for pool ${poolId} for user ${req.session.user.id}`);
    
    // First, check if user has an active package
    const [userPackages] = await db.promise().query(
      "SELECT * FROM packages WHERE user_id = ? AND remaining_sessions > 0 AND expiry_date >= CURDATE()",
      [req.session.user.id]
    );

    if (!userPackages.length) {
      console.log('No active package found');
      return res.json([]);
    }

    const userPackageType = userPackages[0].type;
    
    // Fix: Use correct case for table name - "Pools" instead of "pools"
    const [poolInfo] = await db.promise().query(
      "SELECT name FROM Pools WHERE id = ?",
      [poolId]
    );
    
    const poolName = poolInfo.length ? poolInfo[0].name : 'Unknown Pool';
    console.log(`Processing sessions for pool: ${poolName} (ID: ${poolId})`);
    
    // Get sessions matching the user's package type with proper filtering of past sessions
    const [sessions] = await db.promise().query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM reservations r WHERE r.session_id = s.id AND (r.status IS NULL OR r.status != 'canceled')) as booked,
        (s.initial_capacity - (SELECT COUNT(*) FROM reservations r WHERE r.session_id = s.id AND (r.status IS NULL OR r.status != 'canceled'))) as available_spots,
        (SELECT COUNT(*) FROM reservations r WHERE r.session_id = s.id AND r.user_id = ? AND (r.status IS NULL OR r.status != 'canceled')) as user_has_booked
       FROM sessions s 
       WHERE s.pool_id = ? 
       AND s.type = ?
       AND (
         -- Create a datetime in Turkish time and compare with current time
         STR_TO_DATE(CONCAT(DATE(s.session_date), ' ', s.start_time), '%Y-%m-%d %H:%i:%s') > 
         CONVERT_TZ(NOW(), '+00:00', '+03:00')
       )
       ORDER BY s.session_date, s.start_time`,
      [userId, poolId, userPackageType]
    );
    
    console.log(`Found ${sessions.length} sessions for pool ${poolId} (${poolName}) of type ${userPackageType}`);
    
    // Fix the time calculation for each session
    const sessionsWithLocalTime = sessions.map(session => {
      // Debug the actual session date
      console.log(`Session ${session.id} - Raw session date:`, session.session_date);
      
      // If session.session_date is already a Date object, extract date parts directly
      let year, month, day;
      
      if (session.session_date instanceof Date) {
        // Important: use local date methods to preserve the original date without UTC conversion
        year = session.session_date.getFullYear();
        month = session.session_date.getMonth() + 1; // JS months are 0-indexed
        day = session.session_date.getDate();
        console.log(`Session ${session.id} - Using date directly: ${year}-${month}-${day}`);
      } else {
        // Try to parse the date string or object
        try {
          const rawDate = new Date(session.session_date);
          // Use local date methods, NOT UTC methods 
          year = rawDate.getFullYear();
          month = rawDate.getMonth() + 1;
          day = rawDate.getDate();
          console.log(`Session ${session.id} - Parsed from value: ${year}-${month}-${day}`);
        } catch (err) {
          console.log(`Error parsing date for session ${session.id}:`, err);
          return null;
        }
      }
      
      // Debug the extracted date components
      console.log(`Session ${session.id} - Final date components: Y=${year}, M=${month}, D=${day}`);
      
      // Parse time (stored in Turkish local time)
      const [hours, minutes] = session.start_time.split(':').map(Number);
      
      // Create Date object with extracted parts
      // Important: month is 0-indexed in JS Date constructor
      const sessionDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      
      // Compare with current time
      const now = new Date();
      const hoursUntilSession = (sessionDateTime - now) / (1000 * 60 * 60);
      
      console.log(`Session ${session.id} - Final constructed date: ${sessionDateTime.toISOString()}`);
      console.log(`Session ${session.id} - Hours until: ${hoursUntilSession.toFixed(2)}`);
      
      return {
        ...session,
        hours_until: hoursUntilSession,
        original_date: session.session_date,
        user_has_booked: session.user_has_booked > 0
      };
    }).filter(Boolean);
    
    // Final safety filter - remove any sessions that might have slipped through
    const filteredSessions = sessionsWithLocalTime.filter(session => session.hours_until > 0);
    if (filteredSessions.length !== sessionsWithLocalTime.length) {
      console.log(`Removed ${sessionsWithLocalTime.length - filteredSessions.length} past sessions in final filter`);
    }
    
    res.json(filteredSessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// Get all sessions
router.get("/sessions", isAuthenticated, async (req, res) => {
  try {
    const [sessions] = await db.promise().query(
      `SELECT s.*, p.name as poolName,
        (SELECT COUNT(*) FROM reservations r WHERE r.session_id = s.id) as booked,
        s.initial_capacity as total_capacity
       FROM sessions s 
       JOIN Pools p ON s.pool_id = p.id`
    );

    // Format the sessions data
    const formattedSessions = sessions.map(session => ({
      ...session,
      capacity: session.total_capacity - session.booked,
      start_time: getNextOccurrence(session.day_of_week, session.start_time),
      end_time: getNextOccurrence(session.day_of_week, session.end_time)
    }));

    res.json(formattedSessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Error fetching sessions" });
  }
});

// Book a session - with more robust time validation
router.post("/reservations", isAuthenticated, async (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  try {
    await db.promise().beginTransaction();

    // Check user's health status first
    const [userInfo] = await db.promise().query(
      "SELECT health_status FROM users WHERE id = ?",
      [req.session.user.id]
    );

    if (!userInfo.length) {
      await db.promise().rollback();
      return res.status(404).json({ error: "User not found" });
    }

    // Verify health status is approved
    if (userInfo[0].health_status !== 'approved') {
      await db.promise().rollback();
      return res.status(403).json({ 
        error: "Your health status must be approved before you can make a swimming reservation",
        healthStatus: userInfo[0].health_status
      });
    }

    // Fix the SQL query to avoid reserved keyword conflict
    const [sessionInfo] = await db.promise().query(
      "SELECT *, CONVERT_TZ(NOW(), '+00:00', '+03:00') as current_time_value FROM sessions WHERE id = ?",
      [sessionId]
    );

    if (!sessionInfo.length) {
      await db.promise().rollback();
      return res.status(404).json({ error: "Session not found" });
    }

    const session = sessionInfo[0];
    console.log(`Pool: ${session.pool_id} - Session ID: ${sessionId}`);
    console.log(`Session Date from DB: ${session.session_date}`);
    console.log(`Session Time from DB: ${session.start_time}`);

    // Parse date correctly using local methods to avoid timezone issues
    // Get date components directly
    const rawDate = new Date(session.session_date);
    const year = rawDate.getFullYear();
    const month = rawDate.getMonth();
    const day = rawDate.getDate();
    
    // Parse time components
    const [hours, minutes] = session.start_time.split(':').map(Number);
    
    // Create a date object with the correct time
    const sessionDateTime = new Date(year, month, day, hours, minutes, 0);
    
    console.log(`Session Time in Turkey (display): ${hours}:${minutes}`);
    console.log(`Session Date Components: Y=${year}, M=${month+1}, D=${day}`);
    console.log(`Final Session DateTime: ${sessionDateTime.toISOString()}`);
    
    // Compare with current time
    const now = new Date();
    console.log(`Current Time: ${now.toISOString()}`);
    
    // Calculate hours until session
    const hoursUntilSession = (sessionDateTime - now) / (1000 * 60 * 60);
    console.log(`Hours until session: ${hoursUntilSession}`);

    // Check if session is in the past
    if (hoursUntilSession <= 0) {
      await db.promise().rollback();
      return res.status(400).json({ 
        error: `Cannot book sessions that have already started or are in the past (${hoursUntilSession.toFixed(2)} hours ago)`,
        details: {
          sessionDateTime: sessionDateTime.toISOString(),
          currentTime: now.toISOString(),
          hoursUntil: hoursUntilSession
        }
      });
    }

    // Check if user has an active package - UPDATED to match our other endpoints
    const [packages] = await db.promise().query(
      "SELECT * FROM packages WHERE user_id = ? AND remaining_sessions > 0 AND expiry_date >= CURDATE() ORDER BY created_at DESC LIMIT 1",
      [req.session.user.id]
    );

    if (!packages.length) {
      await db.promise().rollback();
      return res.status(400).json({ error: "No active package found" });
    }

    const activePackage = packages[0];

    // Check package type against session type
    const userPackageType = activePackage.type;
    const sessionType = session.type;

    if (
      (userPackageType === 'education' && sessionType === 'free_swimming') ||
      (userPackageType === 'free_swimming' && sessionType === 'education')
    ) {
      await db.promise().rollback();
      return res.status(400).json({ 
        error: `Your ${userPackageType} package cannot be used for ${sessionType} sessions` 
      });
    }

    // Rest of your existing checks...
    if (session.booked >= session.initial_capacity) {
      await db.promise().rollback();
      return res.status(400).json({ error: "Session is full" });
    }

    // Check for existing active reservation
    const [existingReservation] = await db.promise().query(
      "SELECT * FROM reservations WHERE user_id = ? AND session_id = ? AND (status IS NULL OR status != 'canceled')",
      [req.session.user.id, sessionId]
    );

    if (existingReservation.length > 0) {
      await db.promise().rollback();
      return res.status(400).json({ error: "You already have a reservation for this session" });
    }

    // Check for overlapping reservations - EXCLUDE canceled reservations
    console.log('Checking for overlapping reservations...');

    const [overlappingReservations] = await db.promise().query(
      `SELECT r.id as reservation_id, r.session_id, s1.session_date as existing_date, 
       s1.start_time as existing_start, s1.end_time as existing_end,
       s2.session_date as new_date, s2.start_time as new_start, s2.end_time as new_end
       FROM reservations r 
       JOIN sessions s1 ON r.session_id = s1.id
       JOIN sessions s2 ON s2.id = ?
       WHERE r.user_id = ?
       AND (r.status IS NULL OR r.status != 'canceled')
       AND s1.session_date = s2.session_date
       AND (
         (s2.start_time < s1.end_time AND s2.end_time > s1.start_time)
       )`,
      [sessionId, req.session.user.id]
    );

    console.log('Overlapping reservations found:', overlappingReservations.length);
    if (overlappingReservations.length > 0) {
      console.log('Overlapping details:', JSON.stringify(overlappingReservations));
      await db.promise().rollback();
      return res.status(400).json({ 
        error: "You already have a reservation at this time" 
      });
    }

    // Create reservation
    await db.promise().query(
      "INSERT INTO reservations (user_id, session_id) VALUES (?, ?)",
      [req.session.user.id, sessionId]
    );

    // Update ONLY the active package - FIX: Only update the active package found above
    await db.promise().query(
      "UPDATE packages SET remaining_sessions = remaining_sessions - 1 WHERE id = ?",
      [activePackage.id]
    );

    await db.promise().commit();

    res.json({ 
      success: true,
      message: `Successfully booked ${sessionType} session`
    });
  } catch (error) {
    await db.promise().rollback();
    console.error("Error booking session:", error);
    res.status(500).json({ error: "Error booking session" });
  }
});

// Cancel a reservation - fix to update the active package
router.delete("/reservations/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get details of the reservation to check session time
    const [reservationDetails] = await db.promise().query(
      `SELECT r.*, s.session_date, s.start_time
       FROM reservations r
       JOIN sessions s ON r.session_id = s.id
       WHERE r.id = ? AND r.user_id = ?`,
      [id, req.session.user.id]
    );
    
    if (!reservationDetails.length) {
      return res.status(404).json({ error: "Reservation not found" });
    }
    
    const reservation = reservationDetails[0];
    
    // Check if session is starting within the cancellation window (e.g., 3 hours)
    const sessionDate = new Date(reservation.session_date);
    
    // Parse the hours and minutes from start_time
    const [hours, minutes] = reservation.start_time.split(':').map(Number);
    sessionDate.setHours(hours, minutes);
    
    const now = new Date();
    const hoursUntilSession = (sessionDate - now) / (1000 * 60 * 60);
    
    console.log('Hours until session:', hoursUntilSession);
    
    // If less than 3 hours until session, don't allow cancellation
    if (hoursUntilSession < 3) {
      return res.status(400).json({ 
        error: "Cancellation not allowed less than 3 hours before session",
        details: {
          sessionDate: sessionDate.toISOString(),
          currentTime: now.toISOString(),
          hoursUntilSession: hoursUntilSession.toFixed(2) 
        }
      });
    }

    // Mark reservation as canceled instead of deleting it
    await db.promise().beginTransaction();

    await db.promise().query(
      "UPDATE reservations SET status = 'canceled' WHERE id = ? AND user_id = ?",
      [id, req.session.user.id]
    );

    // Find the active package and refund the session to it
    const [activePackage] = await db.promise().query(
      "SELECT * FROM packages WHERE user_id = ? AND expiry_date >= CURDATE() ORDER BY created_at DESC LIMIT 1",
      [req.session.user.id]
    );

    if (activePackage.length) {
      await db.promise().query(
        "UPDATE packages SET remaining_sessions = remaining_sessions + 1 WHERE id = ?",
        [activePackage[0].id]
      );
    }

    await db.promise().commit();
    res.json({ success: true });
  } catch (error) {
    await db.promise().rollback();
    console.error("Error canceling reservation:", error);
    res.status(500).json({ error: "Error canceling reservation" });
  }
});

// Add this endpoint to handle feedback submission
router.post("/feedback", isAuthenticated, async (req, res) => {
  try {
    const { subject, message } = req.body;
    
    // Validate input
    if (!subject || !message) {
      return res.status(400).json({ error: "Subject and message are required" });
    }
    
    // Insert into database
    const result = await db.promise().query(
      "INSERT INTO feedback (user_id, subject, message) VALUES (?, ?, ?)",
      [req.session.user.id, subject, message]
    );
    
    res.status(201).json({ 
      success: true, 
      message: "Feedback submitted successfully" 
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ error: "Error submitting feedback" });
  }
});

// Add this endpoint to get user's feedback history
router.get("/feedback", isAuthenticated, async (req, res) => {
  try {
    const [feedback] = await db.promise().query(
      `SELECT id, subject, message, status, created_at 
       FROM feedback 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.session.user.id]
    );
    
    res.json(feedback);
  } catch (error) {
    console.error("Error fetching feedback history:", error);
    res.status(500).json({ error: "Error fetching feedback history" });
  }
});

// Get member's transaction history (packages and reservations)
router.get("/history", isAuthenticated, async (req, res) => {
  try {
    // Get all packages (including expired ones)
    // Query only fields that definitely exist in the database
    const [packages] = await db.promise().query(
      `SELECT id, type, price, remaining_sessions, expiry_date, created_at
       FROM packages 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.session.user.id]
    );

    // Calculate derived fields in code instead of querying them
    const enhancedPackages = packages.map(pkg => {
      // Calculate total sessions based on type
      const totalSessions = pkg.type === 'education' ? 12 : 18;
      
      // Calculate if package is active or expired
      const isActive = new Date(pkg.expiry_date) > new Date() && pkg.remaining_sessions > 0;
      
      return {
        ...pkg,
        total_sessions: totalSessions,
        status: isActive ? 'active' : 'expired',
        purchase_date: pkg.created_at // Use created_at as the purchase date
      };
    });

    // Get all reservations (including canceled ones)
    const [reservations] = await db.promise().query(
      `SELECT r.*, r.created_at as reservation_date,
       p.name as poolName, s.type, s.session_date, s.start_time, s.end_time 
       FROM reservations r 
       JOIN sessions s ON r.session_id = s.id 
       JOIN Pools p ON s.pool_id = p.id 
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [req.session.user.id]
    );

    // Preserve the 'missed' status when it's set
    const enhancedReservations = reservations.map(reservation => ({
      ...reservation,
      status: reservation.status || 'completed'
    }));

    res.json({
      packages: enhancedPackages,
      reservations: enhancedReservations
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    res.status(500).json({ error: "Error fetching transaction history" });
  }
});

// Add this new endpoint to get session counts by pool and type
router.get("/pools/:poolId/sessions/count", isAuthenticated, async (req, res) => {
  const { poolId } = req.params;
  const { type } = req.query;
  
  try {
    // Validate session type
    if (type && !['education', 'free_swimming'].includes(type)) {
      return res.status(400).json({ error: "Invalid session type" });
    }
    
    // Add type filter if provided
    const typeFilter = type ? `AND s.type = '${type}'` : '';
    
    // Count future sessions only
    const [result] = await db.promise().query(
      `SELECT COUNT(*) as count
       FROM sessions s 
       WHERE s.pool_id = ? 
       ${typeFilter}
       AND (
         STR_TO_DATE(CONCAT(DATE(s.session_date), ' ', s.start_time), '%Y-%m-%d %H:%i:%s') > 
         CONVERT_TZ(NOW(), '+00:00', '+03:00')
       )`,
      [poolId]
    );
    
    console.log(`Session count for pool ${poolId}, type ${type || 'all'}: ${result[0].count}`);
    res.json({ count: result[0].count });
  } catch (error) {
    console.error("Error fetching session counts:", error);
    res.status(500).json({ error: "Error fetching session counts" });
  }
});

// Get package prices
router.get("/package-prices", async (req, res) => {
  try {
    // Check if there are any packages in the database to get prices
    const [packages] = await db.promise().query(
      `SELECT type, price FROM packages GROUP BY type, price`
    );

    // If we have package prices in the database, return them
    if (packages && packages.length > 0) {
      const prices = {};
      packages.forEach(pkg => {
        prices[pkg.type] = pkg.price;
      });
      
      return res.json({ prices });
    }
    
    // Fallback to default prices if no packages found
    return res.json({
      prices: {
        education: 100.00,
        free_swimming: 150.00
      }
    });
  } catch (error) {
    console.error("Error fetching package prices:", error);
    res.status(500).json({ error: "Error fetching package prices" });
  }
});

// Resubmit verification documents
router.post("/resubmit-verification", isAuthenticated, upload.fields([
  { name: 'idCard', maxCount: 1 },
  { name: 'profilePhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    // Check if user has reached maximum rejections
    const [userRows] = await db.promise().query(
      "SELECT rejection_count FROM users WHERE id = ?",
      [req.session.user.id]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const MAX_REJECTIONS = 3; // Maximum number of rejections allowed
    if (userRows[0].rejection_count >= MAX_REJECTIONS) {
      return res.status(403).json({ 
        error: "Your account has reached the maximum number of verification attempts. Please contact support for assistance."
      });
    }
    
    // Get personal information from the request body
    const { name, surname, dateOfBirth, phone, gender } = req.body;

    // Get file paths if files were uploaded
    const idCardPath = req.files?.idCard 
      ? `id_cards/${path.basename(req.files.idCard[0].path)}`
      : null;

    // Handle profile photo path
    let profilePhotoPath = null;
    if (req.files?.profilePhoto) {
      profilePhotoPath = `profile_photos/${path.basename(req.files.profilePhoto[0].path)}`;
    }

    // Update verification status, personal information, and document paths
    await db.promise().query(
      `UPDATE users SET 
        verification_status = 'pending',
        name = COALESCE(?, name),
        surname = COALESCE(?, surname),
        date_of_birth = COALESCE(?, date_of_birth),
        phone = COALESCE(?, phone),
        gender = COALESCE(?, gender),
        id_card_path = COALESCE(?, id_card_path),
        profile_photo_path = COALESCE(?, profile_photo_path)
      WHERE id = ?`,
      [
        name || null,
        surname || null,
        dateOfBirth || null,
        phone || null,
        gender || null,
        idCardPath,
        profilePhotoPath,
        req.session.user.id
      ]
    );

    res.json({
      success: true,
      message: "Personal information and verification documents updated and resubmitted successfully."
    });
  } catch (error) {
    console.error("Error resubmitting verification:", error);
    res.status(500).json({ error: "Failed to resubmit verification" });
  }
});

// Get user verification status
router.get("/verification-status", isAuthenticated, async (req, res) => {
  try {
    const [result] = await db.promise().query(
      "SELECT verification_status, verification_reason FROM users WHERE id = ?",
      [req.session.user.id]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      status: result[0].verification_status,
      reason: result[0].verification_reason
    });
  } catch (error) {
    console.error("Error fetching verification status:", error);
    res.status(500).json({ error: "Failed to fetch verification status" });
  }
});

// Get user profile
router.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT
        name, surname, email, phone, date_of_birth, gender, swimming_ability, role,
        rejection_count, profile_photo_path, id_card_path
      FROM users WHERE id = ?`,
      [req.session.user.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log("User profile fetched successfully");
    console.log("Profile photo path:", rows[0].profile_photo_path);
    console.log("ID card path:", rows[0].id_card_path);
    console.log("User role:", rows[0].role);
    
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Error fetching user profile" });
  }
});

// Modify the member check-in endpoint
router.post("/check-in", isAuthenticated, async (req, res) => {
  const { reservationId } = req.body;
  const userId = req.session.user.id;

  if (!reservationId) {
    return res.status(400).json({ error: "Reservation ID is required" });
  }

  try {
    // Start a transaction for data consistency
    await db.promise().beginTransaction();

    // Verify that the reservation belongs to the user and is still active
    const [reservationResult] = await db.promise().query(
      `SELECT r.*, s.session_date, s.start_time, s.end_time, s.type, s.pool_id, p.name as pool_name,
       DATE_FORMAT(s.session_date, '%Y-%m-%d') as formatted_date,
       TIME_FORMAT(s.start_time, '%H:%i') as formatted_start,
       TIME_FORMAT(s.end_time, '%H:%i') as formatted_end
       FROM reservations r
       JOIN sessions s ON r.session_id = s.id
       JOIN Pools p ON s.pool_id = p.id
       WHERE r.id = ? AND r.user_id = ? AND r.status != 'canceled'`,
      [reservationId, userId]
    );

    if (!reservationResult.length) {
      await db.promise().rollback();
      return res.status(404).json({ error: "Reservation not found or not active" });
    }

    const reservation = reservationResult[0];
    
    // Check if already checked in
    if (reservation.status === 'completed') {
      await db.promise().rollback();
      return res.status(400).json({ error: "Already checked in for this session" });
    }
    
    // Check if the session is for today
    const sessionDate = new Date(reservation.session_date);
    const today = new Date();
    
    if (sessionDate.toDateString() !== today.toDateString()) {
      await db.promise().rollback();
      return res.status(400).json({ 
        error: "Check-in is only available on the day of the session" 
      });
    }
    
    // Check if it's within 1 hour of the session start time or after the start time
    const sessionStartTime = new Date(
      `${reservation.formatted_date}T${reservation.formatted_start}`
    );
    const now = new Date();
    const oneHourBefore = new Date(sessionStartTime);
    oneHourBefore.setHours(oneHourBefore.getHours() - 1);
    
    if (now < oneHourBefore) {
      await db.promise().rollback();
      return res.status(400).json({ 
        error: "Check-in is only available within 1 hour of the session start time" 
      });
    }
    
    // Get user's package information
    const [packageResult] = await db.promise().query(
      "SELECT * FROM packages WHERE user_id = ? AND remaining_sessions > 0 AND expiry_date >= CURDATE() ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    
    if (!packageResult.length) {
      await db.promise().rollback();
      return res.status(400).json({ error: "No active package found" });
    }
    
    const userPackage = packageResult[0];
    
    // Update reservation status to completed
    await db.promise().query(
      "UPDATE reservations SET status = 'completed' WHERE id = ?",
      [reservationId]
    );
    
    // Commit the transaction
    await db.promise().commit();

    // Return detailed success response
    res.json({
      success: true,
      message: "Check-in successful",
      member: {
        id: userId,
        name: req.session.user.name || '',
        surname: req.session.user.surname || ''
      },
      session: {
        id: reservation.session_id,
        pool_name: reservation.pool_name,
        date: reservation.formatted_date,
        time: `${reservation.formatted_start} - ${reservation.formatted_end}`,
        type: reservation.type
      },
      package: {
        id: userPackage.id,
        type: userPackage.type,
        remaining_sessions: userPackage.remaining_sessions
      }
    });

  } catch (error) {
    await db.promise().rollback();
    console.error("Error during member check-in:", error);
    res.status(500).json({ error: "Error processing check-in" });
  }
});

// Update user profile
router.post("/update-profile", isAuthenticated, async (req, res) => {
  try {
    const { name, surname, email, phone, date_of_birth, gender } = req.body;
    const userId = req.session.user.id;

    // Validate required fields
    if (!name || !surname || !email || !phone || !date_of_birth || !gender) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Update user profile in database
    await db.promise().query(
      `UPDATE users 
       SET name = ?, surname = ?, email = ?, phone = ?, date_of_birth = ?, gender = ? 
       WHERE id = ?`,
      [name, surname, email, phone, date_of_birth, gender, userId]
    );

    // Update user session
    req.session.user = {
      ...req.session.user,
      name,
      surname,
      email,
      phone
    };

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Error updating profile" });
  }
});

// Update user health info (including emergency contact)
router.post("/update-health-info", isAuthenticated, async (req, res) => {
  try {
    const { 
      emergency_contact_name, 
      emergency_contact_phone, 
      emergency_contact_relationship,
      blood_type,
      allergies,
      chronic_conditions,
      medications,
      height,
      weight,
      has_heart_problems,
      chest_pain_activity,
      balance_dizziness,
      other_chronic_disease,
      prescribed_medication,
      bone_joint_issues,
      doctor_supervised_activity,
      health_additional_info
    } = req.body;
    
    const userId = req.session.user.id;

    // Check if emergency contact information is provided
    if (emergency_contact_name && emergency_contact_phone) {
      // Check if health info already exists for this user
      const [existingHealthInfo] = await db.promise().query(
        "SELECT id FROM health_info WHERE user_id = ?",
        [userId]
      );

      if (existingHealthInfo.length > 0) {
        // Update existing health info
        await db.promise().query(
          `UPDATE health_info 
           SET emergency_contact_name = ?, 
               emergency_contact_phone = ?, 
               emergency_contact_relationship = ?
               ${blood_type ? ', blood_type = ?' : ''}
               ${allergies !== undefined ? ', allergies = ?' : ''}
               ${chronic_conditions !== undefined ? ', chronic_conditions = ?' : ''}
               ${medications !== undefined ? ', medications = ?' : ''}
               ${height ? ', height = ?' : ''}
               ${weight ? ', weight = ?' : ''}
               ${has_heart_problems !== undefined ? ', has_heart_problems = ?' : ''}
               ${chest_pain_activity !== undefined ? ', chest_pain_activity = ?' : ''}
               ${balance_dizziness !== undefined ? ', balance_dizziness = ?' : ''}
               ${other_chronic_disease !== undefined ? ', other_chronic_disease = ?' : ''}
               ${prescribed_medication !== undefined ? ', prescribed_medication = ?' : ''}
               ${bone_joint_issues !== undefined ? ', bone_joint_issues = ?' : ''}
               ${doctor_supervised_activity !== undefined ? ', doctor_supervised_activity = ?' : ''}
               ${health_additional_info !== undefined ? ', health_additional_info = ?' : ''}
           WHERE user_id = ?`,
          [
            emergency_contact_name, 
            emergency_contact_phone, 
            emergency_contact_relationship || 'Other', 
            ...(blood_type ? [blood_type] : []),
            ...(allergies !== undefined ? [allergies] : []),
            ...(chronic_conditions !== undefined ? [chronic_conditions] : []),
            ...(medications !== undefined ? [medications] : []),
            ...(height ? [height] : []),
            ...(weight ? [weight] : []),
            ...(has_heart_problems !== undefined ? [has_heart_problems] : []),
            ...(chest_pain_activity !== undefined ? [chest_pain_activity] : []),
            ...(balance_dizziness !== undefined ? [balance_dizziness] : []),
            ...(other_chronic_disease !== undefined ? [other_chronic_disease] : []),
            ...(prescribed_medication !== undefined ? [prescribed_medication] : []),
            ...(bone_joint_issues !== undefined ? [bone_joint_issues] : []),
            ...(doctor_supervised_activity !== undefined ? [doctor_supervised_activity] : []),
            ...(health_additional_info !== undefined ? [health_additional_info] : []),
            userId
          ]
        );
      } else {
        // Insert new health info
        await db.promise().query(
          `INSERT INTO health_info 
           (user_id, blood_type, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userId, 
            blood_type || 'O+', // Default blood type if not provided
            emergency_contact_name, 
            emergency_contact_phone, 
            emergency_contact_relationship || 'Other'
          ]
        );
      }
    }

    res.json({ message: "Health information updated successfully" });
  } catch (error) {
    console.error("Error updating health info:", error);
    res.status(500).json({ error: "Error updating health information" });
  }
});

// Get user health info (including emergency contact)
router.get("/health-info", isAuthenticated, async (req, res) => {
  try {
    const [healthInfo] = await db.promise().query(
      "SELECT * FROM health_info WHERE user_id = ?",
      [req.session.user.id]
    );
    
    if (healthInfo.length === 0) {
      return res.status(404).json({ error: "Health information not found" });
    }
    
    res.json(healthInfo[0]);
  } catch (error) {
    console.error("Error fetching health info:", error);
    res.status(500).json({ error: "Error fetching health information" });
  }
});

// Upload ID card
router.post("/upload-id-card", isAuthenticated, upload.single("idCard"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.session.user.id;
    
    // Store the full path relative to uploads directory
    const relativePath = req.file.path.replace(/^.*[\\\/]uploads[\\\/]/, '');
    console.log("ID Card file uploaded to:", req.file.path);
    console.log("Storing relativePath in database:", relativePath);

    // Update user record with ID card path
    await db.promise().query(
      "UPDATE users SET id_card_path = ? WHERE id = ?",
      [relativePath, userId]
    );

    res.json({
      message: "ID card uploaded successfully",
      filePath: relativePath
    });
  } catch (error) {
    console.error("Error uploading ID card:", error);
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }
    res.status(500).json({ error: "Error uploading ID card" });
  }
});

// Upload profile photo for authenticated users
router.post("/upload-profile-photo", isAuthenticated, upload.single("profilePhoto"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.session.user.id;
    
    // Store the full path relative to uploads directory
    const relativePath = req.file.path.replace(/^.*[\\\/]uploads[\\\/]/, '');
    console.log("Profile photo file uploaded to:", req.file.path);
    console.log("Storing relativePath in database:", relativePath);

    // Update user record with profile photo path
    await db.promise().query(
      "UPDATE users SET profile_photo_path = ? WHERE id = ?",
      [relativePath, userId]
    );

    // Update session data
    if (req.session.user) {
      req.session.user.profile_photo_path = relativePath;
    }

    res.json({
      message: "Profile photo uploaded successfully",
      filePath: relativePath
    });
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }
    res.status(500).json({ error: "Error uploading profile photo" });
  }
});

module.exports = router;