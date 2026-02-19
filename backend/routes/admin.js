const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const db = require("../config/database");
const { sendEmail } = require("../utils/sendEmail");

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: "Unauthorized access" });
  }
  next();
};

// Get all pools
router.get("/pools", isAdmin, async (req, res) => {
  try {
    const [pools] = await db.promise().query("SELECT * FROM \"Pools\"");
    res.json(pools);
  } catch (error) {
    console.error("Error fetching pools:", error);
    res.status(500).json({ error: "Error fetching pools" });
  }
});

// Add new pool
router.post("/pools", isAdmin, async (req, res) => {
  const { name, capacity, rules, location } = req.body;
  
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Pool name is required." });
  }
  if (!capacity || isNaN(capacity) || Number(capacity) <= 0) {
    return res.status(400).json({ error: "Valid capacity is required." });
  }
  if (!rules || !String(rules).trim()) {
    return res.status(400).json({ error: "Pool rules are required." });
  }
  if (!location || !String(location).trim()) {
    return res.status(400).json({ error: "Location is required." });
  }
  
  try {
    const [rows] = await db.promise().query(
      "INSERT INTO \"Pools\" (name, capacity, rules, location) VALUES (?, ?, ?, ?) RETURNING id",
      [name, capacity, rules, location]
    );
    
    res.json({ success: true, poolId: rows[0]?.id });
  } catch (error) {
    console.error("Error adding pool:", error);
    res.status(500).json({ error: "Error adding pool" });
  }
});

// Delete pool
router.delete("/pools/:poolId", isAdmin, async (req, res) => {
  const { poolId } = req.params;
  
  try {
    await db.promise().query("DELETE FROM \"Pools\" WHERE id = ?", [poolId]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting pool:", error);
    res.status(500).json({ error: "Error deleting pool" });
  }
});

// Update pool
router.put("/pools/:poolId", isAdmin, async (req, res) => {
  const { poolId } = req.params;
  const { name, capacity, rules, location } = req.body;
  
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Pool name is required." });
  }
  if (!capacity || isNaN(capacity) || Number(capacity) <= 0) {
    return res.status(400).json({ error: "Valid capacity is required." });
  }
  if (!rules || !String(rules).trim()) {
    return res.status(400).json({ error: "Pool rules are required." });
  }
  if (!location || !String(location).trim()) {
    return res.status(400).json({ error: "Location is required." });
  }
  
  try {
    await db.promise().query(
      "UPDATE \"Pools\" SET name = ?, capacity = ?, rules = ?, location = ? WHERE id = ?",
      [name, capacity, rules, location, poolId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating pool:", error);
    res.status(500).json({ error: "Error updating pool" });
  }
});

// Document proxy - avoids ERR_CONNECTION_RESET with R2/external URLs
router.get("/document/:userId/:type", isAdmin, async (req, res) => {
  try {
    const { userId, type } = req.params;
    const validTypes = { "id-card": "id_card_path", "profile-photo": "profile_photo_path" };
    const dbColumn = validTypes[type];
    if (!dbColumn) return res.status(400).json({ error: "Invalid document type" });

    const [rows] = await db.promise().query(
      `SELECT ${dbColumn} FROM users WHERE id = ?`,
      [userId]
    );
    if (!rows.length || !rows[0][dbColumn]) {
      return res.status(404).json({ error: "Document not found" });
    }
    const docPath = rows[0][dbColumn];

    if (docPath.startsWith("http://") || docPath.startsWith("https://")) {
      const workerUrl = process.env.R2_WORKER_URL?.replace(/\/$/, "");
      let fetchUrl = docPath;
      if (workerUrl) {
        try {
          const u = new URL(docPath);
          const key = u.pathname.replace(/^\//, "");
          if (key) fetchUrl = `${workerUrl}/${key}`;
        } catch (_) {}
      }
      const resp = await axios.get(fetchUrl, {
        responseType: "stream",
        timeout: 15000,
        validateStatus: () => true
      });
      if (resp.status !== 200) {
        return res.status(502).json({ error: "Could not fetch document" });
      }
      const ext = path.extname(new URL(docPath).pathname).toLowerCase();
      if (ext === ".pdf") res.setHeader("Content-Type", "application/pdf");
      else if ([".jpg", ".jpeg"].includes(ext)) res.setHeader("Content-Type", "image/jpeg");
      else if (ext === ".png") res.setHeader("Content-Type", "image/png");
      resp.data.pipe(res);
    } else {
      const fullPath = path.resolve(path.join(__dirname, "..", "uploads", docPath));
      const uploadsDir = path.resolve(path.join(__dirname, "..", "uploads"));
      if (!fullPath.startsWith(uploadsDir + path.sep) && fullPath !== uploadsDir) {
        return res.status(403).send("Forbidden");
      }
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "File not found" });
      }
      const ext = path.extname(fullPath).toLowerCase();
      if (ext === ".pdf") res.setHeader("Content-Type", "application/pdf");
      else if ([".jpg", ".jpeg"].includes(ext)) res.setHeader("Content-Type", "image/jpeg");
      else if (ext === ".png") res.setHeader("Content-Type", "image/png");
      res.sendFile(fullPath);
    }
  } catch (err) {
    console.error("Admin document proxy error:", err);
    res.status(500).json({ error: "Could not load document" });
  }
});

// r2.dev erişilemiyorsa Worker üzerinden servis et
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

// Get user verifications
router.get("/verifications", isAdmin, async (req, res) => {
  try {
    const [users] = await db.promise().query(`
      SELECT 
        id,
        name,
        surname,
        email,
        phone,
        provider,
        date_of_birth,
        gender,
        CASE WHEN id_card_path LIKE 'http%' THEN id_card_path ELSE COALESCE(regexp_replace(id_card_path, '^.*uploads/', ''), id_card_path) END as id_card_path,
        CASE WHEN profile_photo_path LIKE 'http%' THEN profile_photo_path ELSE COALESCE(regexp_replace(profile_photo_path, '^.*uploads/', ''), profile_photo_path) END as profile_photo_path,
        verification_status,
        rejection_count
      FROM users 
      WHERE verification_status = 'pending' AND (rejection_count IS NULL OR rejection_count < 3)
    `);

    const workerUrl = process.env.R2_WORKER_URL;
    const result = users.map((u) => ({
      ...u,
      id_card_path: toWorkerUrlIfR2(u.id_card_path, workerUrl),
      profile_photo_path: toWorkerUrlIfR2(u.profile_photo_path, workerUrl),
    }));
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching verifications:", error);
    res.status(500).json({ error: "Error fetching verifications" });
  }
});

// Update user verification status
router.put("/verifications/:userId", isAdmin, async (req, res) => {
  const { userId } = req.params;
  const { status, reason } = req.body;
  
  try {
    console.log(`Updating verification for user ${userId} to ${status}`); // Debug log
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: "Verification reason is required" });
    }
    
    // Get user email before updating
    const [userRows] = await db.promise().query(
      "SELECT email, name, surname, rejection_count FROM users WHERE id = ?",
      [userId]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const user = userRows[0];
    
    // If rejecting, increment the rejection count
    let rejectionCount = user.rejection_count || 0;
    let isThirdRejection = false;
    
    if (status === 'rejected') {
      rejectionCount += 1;
      isThirdRejection = rejectionCount >= 3;
    }
    
    // Update the verification_status in the database and add reason
    await db.promise().query(
      "UPDATE users SET verification_status = ?, verification_reason = ?, rejection_count = ? WHERE id = ?",
      [status, reason, rejectionCount, userId]
    );
    
    // Log the update result
    const [updatedUser] = await db.promise().query(
      "SELECT verification_status, rejection_count FROM users WHERE id = ?",
      [userId]
    );
    console.log('Updated user status:', updatedUser[0]); // Debug log
    
    // If rejected, send email to the user
    if (status === 'rejected') {
      if (isThirdRejection) {
        await sendThirdRejectionEmail(user.email, user.name, user.surname, reason);
      } else {
        await sendRejectionEmail(user.email, user.name, user.surname, reason);
      }
    }
    
    res.json({ 
      success: true, 
      message: `User verification status updated to ${status}` 
    });
  } catch (error) {
    console.error("Error updating verification:", error);
    res.status(500).json({ error: "Error updating verification" });
  }
});

// Helper function to send rejection email (uses Resend on Render)
const sendRejectionEmail = async (email, firstName, lastName, reason) => {
  try {
    await sendEmail({
      to: email,
      subject: "Swimming Pool Application Status Update",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">Verification Status Update</h2>
          
          <p>Dear ${firstName} ${lastName},</p>
          
          <p>We regret to inform you that your account verification has been <strong style="color: #f44336;">rejected</strong>.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Reason for Rejection:</h3>
            <p style="margin-bottom: 0;">${reason}</p>
          </div>
          
          <p>You can update your information and try again by logging into your account and navigating to the verification section.</p>
          
          <p>If you have any questions or need assistance, please contact our support team.</p>
          
          <p style="border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px; font-size: 0.9em; color: #777; text-align: center;">
            &copy; Swimming Pool Management System
          </p>
        </div>
      `
    });
    console.log(`Rejection email sent to ${email}`);
  } catch (error) {
    console.error("Error sending rejection email:", error);
    // Don't throw the error here to prevent the API from failing
    // Just log it and continue
  }
};

// Helper function to send third rejection email (uses Resend on Render)
const sendThirdRejectionEmail = async (email, firstName, lastName, reason) => {
  try {
    await sendEmail({
      to: email,
      subject: "Swimming Pool Application - Final Verification Status",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">Final Verification Status</h2>
          
          <p>Dear ${firstName} ${lastName},</p>
          
          <p>We regret to inform you that your account verification has been <strong style="color: #f44336;">rejected for the third time</strong>.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Reason for Rejection:</h3>
            <p style="margin-bottom: 0;">${reason}</p>
          </div>
          
          <p><strong>Important:</strong> After three rejections, you will no longer be able to update or resubmit your information through the verification system.</p>
          
          <p>If you still wish to join our platform, you will need to create a new account and complete the membership process again.</p>
          
          <p>If you have any questions or need assistance, please contact our support team.</p>
          
          <p style="border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px; font-size: 0.9em; color: #777; text-align: center;">
            &copy; Swimming Pool Management System
          </p>
        </div>
      `
    });
    console.log(`Final rejection email sent to ${email}`);
  } catch (error) {
    console.error("Error sending third rejection email:", error);
    // Don't throw the error here to prevent the API from failing
    // Just log it and continue
  }
};

// Create new session
router.post("/sessions", isAdmin, async (req, res) => {
  const { poolId, sessionDate, startTime, endTime, capacity, type } = req.body;
  
  try {
    // Validate session times based on type
    const startHour = parseInt(startTime.split(':')[0], 10);
    const endHour = parseInt(endTime.split(':')[0], 10);
    
    // Define time restrictions
    const validTimeRanges = {
      'education': { min: 7, max: 18 },
      'free_swimming': { min: 7, max: 24 }
    };
    
    // Get the valid range for this session type
    const validRange = validTimeRanges[type] || { min: 7, max: 24 };
    
    // Check if times are within valid range
    if (startHour < validRange.min || endHour > validRange.max) {
      return res.status(400).json({ 
        error: `${type === 'education' ? 'Education' : 'Free swimming'} sessions must be scheduled between ${validRange.min}:00 and ${validRange.max}:00` 
      });
    }
    
    // Validate that session is not in the past
    const now = new Date();
    const todayDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if date is in the past
    if (sessionDate < todayDate) {
      return res.status(400).json({ 
        error: `Cannot create sessions for past dates (${sessionDate})` 
      });
    }
    
    // If it's today, check if the start time is in the past
    if (sessionDate === todayDate) {
      const [startHourStr, startMinuteStr] = startTime.split(':');
      const sessionHour = parseInt(startHourStr, 10);
      const sessionMinute = parseInt(startMinuteStr, 10);
      
      if (sessionHour < currentHour || (sessionHour === currentHour && sessionMinute <= currentMinute)) {
        return res.status(400).json({ 
          error: `Cannot create sessions for past times (${startTime}). Current time is ${currentHour}:${String(currentMinute).padStart(2, '0')}` 
        });
      }
    }
    
    // Check that start time is before end time
    if (startHour >= endHour) {
      return res.status(400).json({ error: "Start time must be before end time" });
    }
    
    // Get the pool to check its capacity
    const [poolResults] = await db.promise().query(
      "SELECT capacity FROM \"Pools\" WHERE id = ?",
      [poolId]
    );
    
    if (poolResults.length === 0) {
      return res.status(404).json({ error: "Pool not found" });
    }
    
    const poolCapacity = poolResults[0].capacity;
    
    // Check if session capacity exceeds pool capacity
    if (capacity > poolCapacity) {
      return res.status(400).json({ 
        error: `Session capacity (${capacity}) cannot exceed pool capacity (${poolCapacity})` 
      });
    }
    
    // Check if there's already a session of the same type in the same time slot
    const [existingSessionsOfSameType] = await db.promise().query(
      `SELECT id FROM sessions 
       WHERE pool_id = ? AND session_date = ? AND start_time = ? AND type = ?`,
      [poolId, sessionDate, startTime, type]
    );
    
    if (existingSessionsOfSameType.length > 0) {
      return res.status(400).json({ 
        error: `There is already a ${type === 'education' ? 'education' : 'free swimming'} session scheduled at this time` 
      });
    }
    
    // Get total capacity of all sessions in this time slot
    const [existingSessions] = await db.promise().query(
      `SELECT SUM(initial_capacity) as total_capacity 
       FROM sessions 
       WHERE pool_id = ? AND session_date = ? AND start_time = ?`,
      [poolId, sessionDate, startTime]
    );
    
    const existingCapacity = existingSessions[0].total_capacity || 0;
    const totalCapacityAfterAdd = parseInt(existingCapacity) + parseInt(capacity);
    
    if (totalCapacityAfterAdd > poolCapacity) {
      return res.status(400).json({ 
        error: `Total capacity of all sessions at this time (${totalCapacityAfterAdd}) would exceed pool capacity (${poolCapacity})` 
      });
    }
    
    const [rows] = await db.promise().query(
      "INSERT INTO sessions (pool_id, session_date, start_time, end_time, initial_capacity, type) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
      [poolId, sessionDate, startTime, endTime, capacity, type]
    );
    
    res.json({ success: true, sessionId: rows[0]?.id });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Error creating session" });
  }
});

// Get all sessions
router.get("/sessions", isAdmin, async (req, res) => {
  try {
    const [sessions] = await db.promise().query(`
      SELECT s.*, p.name as pool_name 
      FROM sessions s 
      JOIN "Pools" p ON s.pool_id = p.id
    `);
    
    // Format dates in API responses to be consistent
    const formattedSessions = formatSessionsForResponse(sessions);
    
    res.json(formattedSessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Error fetching sessions" });
  }
});

// Delete session
router.delete("/sessions/:sessionId", isAdmin, async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    await db.promise().query("DELETE FROM sessions WHERE id = ?", [sessionId]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({ error: "Error deleting session" });
  }
});

// Update session
router.put("/sessions/:sessionId", isAdmin, async (req, res) => {
  const { sessionId } = req.params;
  const { poolId, type, sessionDate, startTime, endTime, capacity } = req.body;
  
  try {
    // Get the current session data
    const [currentSession] = await db.promise().query(
      "SELECT * FROM sessions WHERE id = ?",
      [sessionId]
    );
    
    if (currentSession.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    // Validate that session is not in the past
    const now = new Date();
    const todayDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if date is in the past
    if (sessionDate < todayDate) {
      return res.status(400).json({ 
        error: `Cannot update to past dates (${sessionDate})` 
      });
    }
    
    // If it's today, check if the start time is in the past
    if (sessionDate === todayDate) {
      const [startHourStr, startMinuteStr] = startTime.split(':');
      const sessionHour = parseInt(startHourStr, 10);
      const sessionMinute = parseInt(startMinuteStr, 10);
      
      if (sessionHour < currentHour || (sessionHour === currentHour && sessionMinute <= currentMinute)) {
        return res.status(400).json({ 
          error: `Cannot update to past times (${startTime}). Current time is ${currentHour}:${String(currentMinute).padStart(2, '0')}` 
        });
      }
    }
    
    // Get the pool to check its capacity
    const [poolResults] = await db.promise().query(
      "SELECT capacity FROM \"Pools\" WHERE id = ?",
      [poolId]
    );
    
    if (poolResults.length === 0) {
      return res.status(404).json({ error: "Pool not found" });
    }
    
    const poolCapacity = poolResults[0].capacity;
    
    // Check if session capacity exceeds pool capacity
    if (capacity > poolCapacity) {
      return res.status(400).json({ 
        error: `Session capacity (${capacity}) cannot exceed pool capacity (${poolCapacity})` 
      });
    }
    
    // If the session type or time is being changed, check for conflicts
    if (type !== currentSession[0].type || 
        startTime !== currentSession[0].start_time || 
        sessionDate !== currentSession[0].session_date || 
        poolId !== currentSession[0].pool_id) {
      
      // Check if there's already a session of the same type in the same time slot
      const [existingSessionsOfSameType] = await db.promise().query(
        `SELECT id FROM sessions 
         WHERE pool_id = ? AND session_date = ? AND start_time = ? AND type = ? AND id != ?`,
        [poolId, sessionDate, startTime, type, sessionId]
      );
      
      if (existingSessionsOfSameType.length > 0) {
        return res.status(400).json({ 
          error: `There is already a ${type === 'education' ? 'education' : 'free swimming'} session scheduled at this time` 
        });
      }
    }
    
    // Get total capacity of all sessions in this time slot (excluding current session)
    const [existingSessions] = await db.promise().query(
      `SELECT SUM(initial_capacity) as total_capacity 
       FROM sessions 
       WHERE pool_id = ? AND session_date = ? AND start_time = ? AND id != ?`,
      [poolId, sessionDate, startTime, sessionId]
    );
    
    const existingCapacity = existingSessions[0].total_capacity || 0;
    const totalCapacityAfterUpdate = parseInt(existingCapacity) + parseInt(capacity);
    
    if (totalCapacityAfterUpdate > poolCapacity) {
      return res.status(400).json({ 
        error: `Total capacity of all sessions at this time (${totalCapacityAfterUpdate}) would exceed pool capacity (${poolCapacity})` 
      });
    }
    
    await db.promise().query(
      "UPDATE sessions SET pool_id = ?, type = ?, session_date = ?, start_time = ?, end_time = ?, initial_capacity = ? WHERE id = ?",
      [poolId, type, sessionDate, startTime, endTime, capacity, sessionId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating session:", error);
    res.status(500).json({ error: "Error updating session" });
  }
});

// Add endpoints for managing feedback
router.get("/feedback", isAdmin, async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT f.*, u.name AS user_name, u.email AS user_email 
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
    `);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Error fetching feedback" });
  }
});

router.put("/feedback/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (!['new', 'read', 'archived'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    await db.promise().query(
      "UPDATE feedback SET status = ? WHERE id = ?",
      [status, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating feedback:", error);
    res.status(500).json({ error: "Error updating feedback" });
  }
});

// Format dates in API responses to be consistent
const formatSessionsForResponse = (sessions) => {
  return sessions.map(session => {
    // Convert times to explicit Turkish time format for clarity
    const sessionDate = new Date(session.session_date);
    
    return {
      ...session,
      formatted_date: sessionDate.toISOString().split('T')[0],
      // Times are already stored as Turkish local time strings in DB
      display_time: `${session.start_time} - ${session.end_time} (Turkey Time)`
    };
  });
};

module.exports = router;