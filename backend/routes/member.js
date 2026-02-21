const express = require("express");
const router = express.Router();
const db = require("../config/database");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { uploadToR2 } = require("../utils/r2Storage");

function toWorkerUrlIfR2(urlPath, workerUrl) {
  if (!urlPath || !workerUrl || typeof urlPath !== "string") return urlPath;
  if (!urlPath.startsWith("http")) return urlPath;
  try {
    const u = new URL(urlPath);
    const key = u.pathname.replace(/^\//, "");
    if (key) return `${workerUrl.replace(/\/$/, "")}/${key}`;
  } catch (_) {}
  return urlPath;
}

const useR2 = process.env.USE_R2 === 'true';

const storage = useR2
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const dest = file.fieldname === 'idCard' ? 'uploads/id_cards' : 'uploads/profile_photos';
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        const userId = getCurrentUserId(req) || 'unknown';
        cb(null, `${userId}-${Date.now()}${path.extname(file.originalname)}`);
      }
    });

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Helper to get current user (supports both session and Passport)
function getCurrentUser(req) {
  return req.session?.user || (req.isAuthenticated?.() && req.user) || null;
}

// Helper to get current user ID
function getCurrentUserId(req) {
  const user = getCurrentUser(req);
  return user?.id ?? null;
}

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!getCurrentUser(req)) {
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
      "SELECT * FROM packages WHERE user_id = ? AND remaining_sessions > 0 AND expiry_date >= CURRENT_DATE ORDER BY created_at DESC LIMIT 1",
      [getCurrentUserId(req)]
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
      "SELECT * FROM packages WHERE user_id = ? AND remaining_sessions > 0 AND expiry_date >= CURRENT_DATE",
      [getCurrentUserId(req)]
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
      [getCurrentUserId(req), type, price, sessions, expiryDate]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error purchasing package:", error);
    res.status(500).json({ error: "Error purchasing package" });
  }
});

// Session times are stored as Istanbul local time. Compare by converting to UTC explicitly.
// Fixes timezone mismatch when DB session timezone is GMT/UTC (Neon, Render).

// Get member's reservations
router.get("/reservations", isAuthenticated, async (req, res) => {
  try {
    // Mark expired reservations as "missed"
    await db.query(
      `UPDATE reservations r
       SET status = 'missed'
       FROM sessions s
       WHERE r.session_id = s.id
       AND r.user_id = $1
       AND (r.status IS NULL OR r.status = 'active')
       AND ((s.session_date + s.end_time)::timestamp AT TIME ZONE 'Europe/Istanbul') < NOW()`,
      [getCurrentUserId(req)]
    );

    // Get reservations that are still "current" - show until session ends (includes completed/checked-in)
    const [reservations] = await db.promise().query(
      `SELECT r.*, p.name as "poolName", p.location as "poolLocation", s.type, s.session_date, s.start_time, s.end_time
       FROM reservations r
       JOIN sessions s ON r.session_id = s.id 
       JOIN "Pools" p ON s.pool_id = p.id 
       WHERE r.user_id = ? 
       AND (r.status IS NULL OR (r.status != 'canceled' AND r.status != 'missed'))
       AND ((s.session_date + s.end_time)::timestamp AT TIME ZONE 'Europe/Istanbul') > NOW()
       ORDER BY s.session_date, s.start_time`,
      [getCurrentUserId(req)]
    );

    res.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).json({ error: "Error fetching reservations" });
  }
});

// Get sessions for a specific pool - fix date conversion issue
router.get("/pools/:poolId/sessions", isAuthenticated, async (req, res) => {
  const { poolId } = req.params;
  const userId = getCurrentUserId(req);
  
  try {
    console.log(`Getting sessions for pool ${poolId} for user ${getCurrentUserId(req)}`);
    
    // First, check if user has an active package
    const [userPackages] = await db.promise().query(
      "SELECT * FROM packages WHERE user_id = ? AND remaining_sessions > 0 AND expiry_date >= CURRENT_DATE",
      [getCurrentUserId(req)]
    );

    if (!userPackages.length) {
      console.log('No active package found');
      return res.json([]);
    }

    const userPackageType = userPackages[0].type;
    
    // Fix: Use correct case for table name - "Pools" instead of "pools"
    const [poolInfo] = await db.promise().query(
      "SELECT name FROM \"Pools\" WHERE id = ?",
      [poolId]
    );
    
    const poolName = poolInfo.length ? poolInfo[0].name : 'Unknown Pool';
    console.log(`Processing sessions for pool: ${poolName} (ID: ${poolId})`);
    
    // Get sessions matching the user's package type with proper filtering of past sessions
    const [sessions] = await db.promise().query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM reservations r WHERE r.session_id = s.id AND (r.status IS NULL OR r.status != 'canceled')) as booked,
        (s.initial_capacity - (SELECT COUNT(*) FROM reservations r WHERE r.session_id = s.id AND (r.status IS NULL OR r.status != 'canceled'))) as available_spots,
        (SELECT COUNT(*) FROM reservations r WHERE r.session_id = s.id AND r.user_id = $1 AND (r.status IS NULL OR r.status != 'canceled')) as user_has_booked
       FROM sessions s 
       WHERE s.pool_id = $2 
       AND s.type = $3
       AND ((s.session_date + s.start_time)::timestamp AT TIME ZONE 'Europe/Istanbul') > NOW()
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
       JOIN "Pools" p ON s.pool_id = p.id`
    );

    // Format the sessions data (session_date, start_time, end_time from DB)
    const formattedSessions = sessions.map(session => ({
      ...session,
      capacity: session.total_capacity - session.booked
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
    const bookingResult = await db.transaction(async (trx) => {

    // Check user's health status first
    const [userInfo] = await trx.query(
      "SELECT health_status FROM users WHERE id = ?",
      [getCurrentUserId(req)]
    );

    if (!userInfo.length) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    if (userInfo[0].health_status !== 'approved') {
      const err = new Error("Your health status must be approved before you can make a swimming reservation");
      err.statusCode = 403;
      err.healthStatus = userInfo[0].health_status;
      throw err;
    }

    const [sessionInfo] = await trx.query(
      "SELECT * FROM sessions WHERE id = ?",
      [sessionId]
    );

    if (!sessionInfo.length) {
      const err = new Error("Session not found");
      err.statusCode = 404;
      throw err;
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
      const err = new Error(`Cannot book sessions that have already started or are in the past`);
      err.statusCode = 400;
      err.details = { sessionDateTime, now, hoursUntilSession };
      throw err;
    }

    // Check if user has an active package
    const [packages] = await trx.query(
      "SELECT * FROM packages WHERE user_id = ? AND remaining_sessions > 0 AND expiry_date >= CURRENT_DATE ORDER BY created_at DESC LIMIT 1",
      [getCurrentUserId(req)]
    );

    if (!packages.length) {
      const err = new Error("No active package found");
      err.statusCode = 400;
      throw err;
    }

    const activePackage = packages[0];
    const userPackageType = activePackage.type;
    const sessionType = session.type;

    if (
      (userPackageType === 'education' && sessionType === 'free_swimming') ||
      (userPackageType === 'free_swimming' && sessionType === 'education')
    ) {
      const err = new Error(`Your ${userPackageType} package cannot be used for ${sessionType} sessions`);
      err.statusCode = 400;
      throw err;
    }

    // Session needs booked count - fetch if not present
    let bookedCount = session.booked;
    if (bookedCount === undefined) {
      const [countRes] = await trx.query(
        "SELECT COUNT(*) as cnt FROM reservations r WHERE r.session_id = ? AND (r.status IS NULL OR r.status != 'canceled')",
        [sessionId]
      );
      bookedCount = parseInt(countRes[0]?.cnt || 0, 10);
    }
    if (bookedCount >= session.initial_capacity) {
      const err = new Error("Session is full");
      err.statusCode = 400;
      throw err;
    }

    const [existingReservation] = await trx.query(
      "SELECT * FROM reservations WHERE user_id = ? AND session_id = ? AND (status IS NULL OR status != 'canceled')",
      [getCurrentUserId(req), sessionId]
    );

    if (existingReservation.length > 0) {
      const err = new Error("You already have a reservation for this session");
      err.statusCode = 400;
      throw err;
    }

    const [overlappingReservations] = await trx.query(
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
      [sessionId, getCurrentUserId(req)]
    );

    if (overlappingReservations.length > 0) {
      const err = new Error("You already have a reservation at this time");
      err.statusCode = 400;
      throw err;
    }

    await trx.query(
      "INSERT INTO reservations (user_id, session_id) VALUES (?, ?)",
      [getCurrentUserId(req), sessionId]
    );

    await trx.query(
      "UPDATE packages SET remaining_sessions = remaining_sessions - 1 WHERE id = ?",
      [activePackage.id]
    );

    return { success: true, message: `Successfully booked ${sessionType} session` };
    });

    res.json(bookingResult);
  } catch (error) {
    if (error.statusCode) {
      const body = { error: error.message };
      if (error.details) body.details = error.details;
      if (error.healthStatus) body.healthStatus = error.healthStatus;
      return res.status(error.statusCode).json(body);
    }
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
      [id, getCurrentUserId(req)]
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

    await db.transaction(async (trx) => {
      await trx.query(
        "UPDATE reservations SET status = 'canceled' WHERE id = ? AND user_id = ?",
        [id, getCurrentUserId(req)]
      );

      const [activePackage] = await trx.query(
        "SELECT * FROM packages WHERE user_id = ? AND expiry_date >= CURRENT_DATE ORDER BY created_at DESC LIMIT 1",
        [getCurrentUserId(req)]
      );

      if (activePackage.length) {
        await trx.query(
          "UPDATE packages SET remaining_sessions = remaining_sessions + 1 WHERE id = ?",
          [activePackage[0].id]
        );
      }
    });
    res.json({ success: true });
  } catch (error) {
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
      [getCurrentUserId(req), subject, message]
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
      [getCurrentUserId(req)]
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
      [getCurrentUserId(req)]
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
       p.name as "poolName", p.location as "poolLocation", s.type, s.session_date, s.start_time, s.end_time
       FROM reservations r
       JOIN sessions s ON r.session_id = s.id 
       JOIN "Pools" p ON s.pool_id = p.id 
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [getCurrentUserId(req)]
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
       AND ((s.session_date + s.start_time)::timestamp AT TIME ZONE 'Europe/Istanbul') > NOW()`,
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
      [getCurrentUserId(req)]
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

    let idCardPath = null;
    let profilePhotoPath = null;
    if (req.files?.idCard?.[0]) {
      const file = req.files.idCard[0];
      if (useR2 && file.buffer) {
        const ext = path.extname(file.originalname) || '.pdf';
        idCardPath = await uploadToR2(file.buffer, `id_cards/${getCurrentUserId(req)}-${Date.now()}${ext}`, file.mimetype);
      } else {
        idCardPath = `id_cards/${path.basename(file.path)}`;
      }
    }
    if (req.files?.profilePhoto?.[0]) {
      const file = req.files.profilePhoto[0];
      if (useR2 && file.buffer) {
        const ext = path.extname(file.originalname) || '.jpg';
        profilePhotoPath = await uploadToR2(file.buffer, `profile_photos/${getCurrentUserId(req)}-${Date.now()}${ext}`, file.mimetype);
      } else {
        profilePhotoPath = `profile_photos/${path.basename(file.path)}`;
      }
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
        getCurrentUserId(req)
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
      [getCurrentUserId(req)]
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
      [getCurrentUserId(req)]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log("User profile fetched successfully");
    console.log("Profile photo path:", rows[0].profile_photo_path);
    console.log("ID card path:", rows[0].id_card_path);
    console.log("User role:", rows[0].role);

    const workerUrl = process.env.R2_WORKER_URL;
    const profile = {
      ...rows[0],
      id_card_path: toWorkerUrlIfR2(rows[0].id_card_path, workerUrl) || rows[0].id_card_path,
      profile_photo_path: toWorkerUrlIfR2(rows[0].profile_photo_path, workerUrl) || rows[0].profile_photo_path
    };

    res.json(profile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Error fetching user profile" });
  }
});

// Member check-in endpoint
router.post("/check-in", isAuthenticated, async (req, res) => {
  const { reservationId } = req.body;
  const userId = getCurrentUserId(req);

  if (!reservationId) {
    return res.status(400).json({ error: "Reservation ID is required" });
  }

  try {
    // Verify that the reservation belongs to the user and is still active
    const [reservationResult] = await db.promise().query(
      `SELECT r.*, s.session_date, s.start_time, s.end_time, s.type, s.pool_id, p.name as pool_name,
       to_char(s.session_date, 'YYYY-MM-DD') as formatted_date,
       to_char(s.start_time, 'HH24:MI') as formatted_start,
       to_char(s.end_time, 'HH24:MI') as formatted_end
       FROM reservations r
       JOIN sessions s ON r.session_id = s.id
       JOIN "Pools" p ON s.pool_id = p.id
       WHERE r.id = ? AND r.user_id = ? AND r.status != 'canceled'`,
      [reservationId, userId]
    );

    if (!reservationResult.length) {
      return res.status(404).json({ error: "Reservation not found or not active" });
    }

    const reservation = reservationResult[0];

    // Check if already checked in
    if (reservation.status === 'completed') {
      return res.status(400).json({ error: "Already checked in for this session" });
    }

    // Check-in window: from 1 day before session start to 15 minutes after session start
    // Session times are stored as Turkey local time (Europe/Istanbul, UTC+3)
    const sessionStartTime = new Date(
      `${reservation.formatted_date}T${reservation.formatted_start}+03:00`
    );
    const now = new Date();
    const oneDayBefore = new Date(sessionStartTime.getTime() - 24 * 60 * 60 * 1000);
    const fifteenMinutesAfter = new Date(sessionStartTime);
    fifteenMinutesAfter.setMinutes(fifteenMinutesAfter.getMinutes() + 15);

    if (now < oneDayBefore) {
      return res.status(400).json({
        error: "Check-in is only available from 1 day before your session starts."
      });
    }
    if (now > fifteenMinutesAfter) {
      return res.status(400).json({
        error: "Check-in window has closed. You can only check in up to 15 minutes after your session starts."
      });
    }

    // Get user's package information
    const [packageResult] = await db.promise().query(
      "SELECT * FROM packages WHERE user_id = ? AND remaining_sessions > 0 AND expiry_date >= CURRENT_DATE ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    if (!packageResult.length) {
      return res.status(400).json({ error: "No active package found" });
    }

    const userPackage = packageResult[0];

    // Generate unique check-in code (format required by staff verification)
    const checkInCode = `${reservationId}-${Date.now()}`;

    // Update reservation status and store check-in code for cross-device QR access
    try {
      await db.promise().query(
        `UPDATE reservations SET status = 'completed', check_in_code = ?, checked_in_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [checkInCode, reservationId]
      );
    } catch (colErr) {
      // Fallback if migration not run (column doesn't exist)
      if (colErr.message?.includes('check_in_code') || colErr.message?.includes('does not exist')) {
        await db.promise().query(
          "UPDATE reservations SET status = 'completed' WHERE id = ?",
          [reservationId]
        );
      } else {
        throw colErr;
      }
    }

    res.json({
      success: true,
      message: "Check-in successful",
      checkInCode,
      checkedInAt: new Date().toISOString(),
      member: {
        id: userId,
        name: getCurrentUser(req)?.name || '',
        surname: getCurrentUser(req)?.surname || ''
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
    console.error("Error during member check-in:", error);
    res.status(500).json({
      error: error.message || "Error processing check-in",
      message: error.message || "Error processing check-in"
    });
  }
});

// Update user profile
router.post("/update-profile", isAuthenticated, async (req, res) => {
  try {
    const { name, surname, email, phone, date_of_birth, gender } = req.body;
    const userId = getCurrentUserId(req);

    // Map "Prefer not to say" to "Other" (DB enum only has Male, Female, Other)
    const genderValue = (gender === 'Prefer not to say' || !['Male', 'Female', 'Other'].includes(gender)) ? 'Other' : gender;

    if (!userId) {
      console.error("Update profile: No user ID - session.user:", !!req.session?.user, "req.user:", !!req.user);
      return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
    }
    console.log("Update profile: userId=", userId, "role=", req.session?.user?.role ?? req.user?.role);

    // Validate required fields (gender can be "Prefer not to say" - we map it to Other)
    if (!name || !surname || !email || !phone || !date_of_birth || !gender) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // If email is being changed, check it's not already used by another user
    const [currentUser] = await db.promise().query(
      "SELECT email FROM users WHERE id = ?",
      [userId]
    );
    if (currentUser.length > 0 && currentUser[0].email !== email) {
      const [existingEmail] = await db.promise().query(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, userId]
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({ error: "This email is already in use by another account." });
      }
    }

    // Same check for phone if unique
    const [existingPhone] = await db.promise().query(
      "SELECT id FROM users WHERE phone = ? AND id != ?",
      [phone, userId]
    );
    if (existingPhone.length > 0) {
      return res.status(400).json({ error: "This phone number is already in use by another account." });
    }

    // Update user profile in database (use pool directly to check rowCount)
    const pgSql = `UPDATE users SET name = $1, surname = $2, email = $3, phone = $4, date_of_birth = $5, gender = $6 WHERE id = $7`;
    const updateResult = await db.pool.query(pgSql, [name, surname, email, phone, date_of_birth, genderValue, userId]);
    if (updateResult.rowCount === 0) {
      console.error("Update profile: No rows affected for userId=", userId);
      return res.status(404).json({ error: "User not found. Please log in again." });
    }

    // Update session if it exists (keeps UI in sync)
    if (req.session?.user) {
      req.session.user = { ...req.session.user, name, surname, email, phone };
    }

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    // Show meaningful error message to user
    if (error.code === "ER_DUP_ENTRY") {
      if (error.message && error.message.includes("email")) {
        return res.status(400).json({ error: "This email is already in use by another account." });
      }
      if (error.message && error.message.includes("phone")) {
        return res.status(400).json({ error: "This phone number is already in use by another account." });
      }
    }
    res.status(500).json({ error: error.message || "Error updating profile. Please try again." });
  }
});

// Update user health info (including emergency contact and health questions)
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
    
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
    }
    console.log("Update health-info: userId=", userId, "existing check...");

    // Always fetch existing health info - we update health questions even when emergency contact is empty
    const [existingHealthInfo] = await db.promise().query(
      "SELECT * FROM health_info WHERE user_id = ?",
      [userId]
    );

    if (existingHealthInfo.length > 0) {
      console.log("Update health-info: Updating existing record for userId=", userId);
      const existing = existingHealthInfo[0];
      // Update existing: use provided values or keep existing for required fields
      const ecName = (emergency_contact_name && emergency_contact_name.trim()) ? emergency_contact_name.trim() : existing.emergency_contact_name;
      const ecPhone = (emergency_contact_phone && emergency_contact_phone.trim()) ? emergency_contact_phone.trim() : existing.emergency_contact_phone;
      
      const pgSql = `UPDATE health_info SET 
        emergency_contact_name = $1, emergency_contact_phone = $2, emergency_contact_relationship = $3,
        blood_type = $4, allergies = $5, chronic_conditions = $6, medications = $7,
        height = $8, weight = $9,
        has_heart_problems = $10, chest_pain_activity = $11, balance_dizziness = $12,
        other_chronic_disease = $13, prescribed_medication = $14, bone_joint_issues = $15,
        doctor_supervised_activity = $16, health_additional_info = $17
        WHERE user_id = $18`;
      
      const hasHeart = has_heart_problems !== undefined ? (has_heart_problems === 1 || has_heart_problems === true) : existing.has_heart_problems;
      const chestPain = chest_pain_activity !== undefined ? (chest_pain_activity === 1 || chest_pain_activity === true) : existing.chest_pain_activity;
      const balance = balance_dizziness !== undefined ? (balance_dizziness === 1 || balance_dizziness === true) : existing.balance_dizziness;
      const otherChronic = other_chronic_disease !== undefined ? (other_chronic_disease === 1 || other_chronic_disease === true) : existing.other_chronic_disease;
      const prescribed = prescribed_medication !== undefined ? (prescribed_medication === 1 || prescribed_medication === true) : existing.prescribed_medication;
      const boneJoint = bone_joint_issues !== undefined ? (bone_joint_issues === 1 || bone_joint_issues === true) : existing.bone_joint_issues;
      const doctorSupervised = doctor_supervised_activity !== undefined ? (doctor_supervised_activity === 1 || doctor_supervised_activity === true) : existing.doctor_supervised_activity;

      await db.pool.query(pgSql, [
        ecName || '', ecPhone || '', (emergency_contact_relationship && emergency_contact_relationship.trim()) || existing.emergency_contact_relationship || 'Other',
        blood_type || existing.blood_type || 'O+',
        allergies !== undefined ? allergies : existing.allergies,
        chronic_conditions !== undefined ? chronic_conditions : existing.chronic_conditions,
        medications !== undefined ? medications : existing.medications,
        height !== undefined && height !== '' ? height : existing.height,
        weight !== undefined && weight !== '' ? weight : existing.weight,
        hasHeart, chestPain, balance, otherChronic, prescribed, boneJoint, doctorSupervised,
        health_additional_info !== undefined ? health_additional_info : existing.health_additional_info,
        userId
      ]);
    } else {
      console.log("Update health-info: Creating new record for userId=", userId);
      // No health_info exists - INSERT new record (use placeholders for required NOT NULL fields if empty)
      const ecName = (emergency_contact_name && String(emergency_contact_name).trim()) ? String(emergency_contact_name).trim() : 'Not provided';
      const ecPhone = (emergency_contact_phone && String(emergency_contact_phone).trim()) ? String(emergency_contact_phone).trim() : '05000000000';
      const hasHeart = has_heart_problems === 1 || has_heart_problems === true;
      const chestPain = chest_pain_activity === 1 || chest_pain_activity === true;
      const balance = balance_dizziness === 1 || balance_dizziness === true;
      const otherChronic = other_chronic_disease === 1 || other_chronic_disease === true;
      const prescribed = prescribed_medication === 1 || prescribed_medication === true;
      const boneJoint = bone_joint_issues === 1 || bone_joint_issues === true;
      const doctorSupervised = doctor_supervised_activity === 1 || doctor_supervised_activity === true;

      await db.pool.query(
        `INSERT INTO health_info (user_id, blood_type, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
          has_heart_problems, chest_pain_activity, balance_dizziness, other_chronic_disease, prescribed_medication,
          bone_joint_issues, doctor_supervised_activity, allergies, chronic_conditions, medications, height, weight, health_additional_info)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [userId, blood_type || 'O+', ecName, ecPhone, (emergency_contact_relationship && String(emergency_contact_relationship).trim()) || 'Other',
          hasHeart, chestPain, balance, otherChronic, prescribed, boneJoint, doctorSupervised,
          allergies || null, chronic_conditions || null, medications || null, height || null, weight || null, health_additional_info || null]
      );
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
      [getCurrentUserId(req)]
    );
    
    if (healthInfo.length === 0) {
      return res.json({}); // No health info yet - frontend uses defaults
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
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const userId = getCurrentUserId(req);
    let filePath;
    if (useR2 && req.file.buffer) {
      const ext = path.extname(req.file.originalname) || '.pdf';
      filePath = await uploadToR2(req.file.buffer, `id_cards/${userId}-${Date.now()}${ext}`, req.file.mimetype);
    } else {
      filePath = req.file.path.replace(/^.*[\\\/]uploads[\\\/]/, '');
    }
    await db.promise().query("UPDATE users SET id_card_path = ? WHERE id = ?", [filePath, userId]);
    res.json({ message: "ID card uploaded successfully", filePath });
  } catch (error) {
    console.error("Error uploading ID card:", error);
    if (req.file?.path) fs.unlink(req.file.path, (err) => { if (err) console.error("Error deleting file:", err); });
    res.status(500).json({ error: "Error uploading ID card" });
  }
});

// Upload profile photo for authenticated users
router.post("/upload-profile-photo", isAuthenticated, upload.single("profilePhoto"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const userId = getCurrentUserId(req);
    let filePath;
    if (useR2 && req.file.buffer) {
      const ext = path.extname(req.file.originalname) || '.jpg';
      filePath = await uploadToR2(req.file.buffer, `profile_photos/${userId}-${Date.now()}${ext}`, req.file.mimetype);
    } else {
      filePath = req.file.path.replace(/^.*[\\\/]uploads[\\\/]/, '');
    }
    await db.promise().query("UPDATE users SET profile_photo_path = ? WHERE id = ?", [filePath, userId]);
    if (req.session.user) req.session.user.profile_photo_path = filePath;
    res.json({ message: "Profile photo uploaded successfully", filePath });
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    if (req.file?.path) fs.unlink(req.file.path, (err) => { if (err) console.error("Error deleting file:", err); });
    res.status(500).json({ error: "Error uploading profile photo" });
  }
});

module.exports = router;