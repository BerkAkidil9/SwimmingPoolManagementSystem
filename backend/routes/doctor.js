const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { sendEmail } = require("../utils/sendEmail");
const { escapeHtml } = require("../utils/security");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { uploadToR2 } = require("../utils/r2Storage");

const useR2 = process.env.USE_R2 === 'true';

const isDoctor = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'doctor') {
    return res.status(403).json({ error: "Unauthorized access" });
  }
  next();
};

const storage = useR2
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(__dirname, "../uploads/health_reports");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const userId = req.params.userId || 'unknown';
        cb(null, `user-${userId}-health-report-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
      }
    });

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|jpg|jpeg|png/;
    if (filetypes.test(file.mimetype) && filetypes.test(path.extname(file.originalname).toLowerCase())) {
      return cb(null, true);
    }
    cb(new Error("Only pdf, jpg, jpeg, and png files are allowed"));
  }
});

// Get patients needing health status review
router.get("/health-reviews", isDoctor, async (req, res) => {
  try {
    const [users] = await db.promise().query(`
      SELECT 
        u.id,
        u.name,
        u.surname,
        u.email,
        u.phone,
        u.date_of_birth,
        u.gender,
        u.health_status,
        u.health_status_reason,
        u.health_report_request_count,
        h.blood_type,
        h.allergies,
        h.chronic_conditions,
        h.medications,
        h.height,
        h.weight,
        h.emergency_contact_name,
        h.emergency_contact_phone,
        h.emergency_contact_relationship,
        h.emergency_contact_relationship_other,
        h.has_heart_problems,
        h.chest_pain_activity,
        h.balance_dizziness,
        h.other_chronic_disease,
        h.prescribed_medication,
        h.bone_joint_issues,
        h.doctor_supervised_activity,
        h.health_additional_info,
        (SELECT COUNT(*) FROM health_reports hr WHERE hr.user_id = u.id) as report_count,
        (SELECT MAX(created_at) FROM health_reports hr WHERE hr.user_id = u.id) as last_report_date
      FROM users u
      JOIN health_info h ON u.id = h.user_id
      WHERE u.verification_status = 'approved' 
      AND u.health_status IN ('pending', 'needs_report')
      ORDER BY 
        CASE 
          WHEN u.health_status = 'needs_report' AND (SELECT COUNT(*) FROM health_reports hr WHERE hr.user_id = u.id) > 0 THEN 1 
          WHEN u.health_status = 'needs_report' THEN 2
          WHEN u.health_status = 'pending' AND (SELECT COUNT(*) FROM health_reports hr WHERE hr.user_id = u.id) > 0 THEN 3
          ELSE 4
        END, 
        (SELECT MAX(created_at) FROM health_reports hr WHERE hr.user_id = u.id) DESC,
        u.id DESC
    `);
    
    res.json(users);
  } catch (error) {
    console.error("Error fetching health reviews:", error);
    res.status(500).json({ error: "Error fetching health reviews" });
  }
});

// Update health status
router.put("/health-status/:userId", isDoctor, async (req, res) => {
  const { userId } = req.params;
  const { status, reason } = req.body;
  
  try {
    // Validate input
    if (!status || !['approved', 'needs_report', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: "Reason/notes are required for all health status updates (approval, rejection, or report request)" });
    }
    
    // Get user data before updating
    const [userRows] = await db.promise().query(
      `SELECT u.email, u.name, u.surname, u.health_report_request_count, u.health_status,
       (SELECT COUNT(*) FROM health_reports hr WHERE hr.user_id = u.id 
        AND (u.health_report_requested_at IS NULL OR hr.created_at >= u.health_report_requested_at)) as report_count
       FROM users u WHERE u.id = ?`,
      [userId]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const user = userRows[0];
    
    // Cannot approve when report was requested but user hasn't uploaded yet (need to review the report)
    if (status === 'approved' && user.health_status === 'needs_report') {
      const reportCount = user.report_count || 0;
      if (reportCount === 0) {
        return res.status(400).json({ 
          error: "Cannot approve until the user has uploaded the requested health report" 
        });
      }
    }
    // Reject is allowed even without upload - e.g. user never submitted the requested report
    
    // Check request limit only when requesting a health report
    if (status === 'needs_report') {
      // Maximum of 3 health report requests allowed
      const currentRequestCount = user.health_report_request_count || 0;
      
      if (currentRequestCount >= 3) {
        return res.status(400).json({
          error: "Maximum request limit reached",
          message: "You have already requested a health report 3 times for this user. No more requests are allowed."
        });
      }
      
      // Increment the request count and update the health_status
      await db.promise().query(
        "UPDATE users SET health_status = ?, health_status_reason = ?, health_report_requested_at = CURRENT_TIMESTAMP, health_report_request_count = health_report_request_count + 1 WHERE id = ?",
        [status, reason, userId]
      );
    } else {
      // For other statuses, just update without incrementing the count
      await db.promise().query(
        "UPDATE users SET health_status = ?, health_status_reason = ? WHERE id = ?",
        [status, reason, userId]
      );
    }
    
    // Send appropriate email based on health status update
    // For 'approved': sent here for first-time review (no reports). When user has reports,
    // frontend only calls health-reports, not this endpoint - so no duplicate.
    if (status === 'needs_report') {
      await sendHealthReportRequestEmail(user.email, user.name, user.surname, reason, userId);
    } else if (status === 'rejected') {
      await sendHealthRejectionEmail(user.email, user.name, user.surname, reason);
    } else if (status === 'approved') {
      await sendHealthReportApprovedEmail(user.email, user.name, user.surname);
    }
    
    res.json({ 
      success: true, 
      message: `User health status updated to ${status}` 
    });
  } catch (error) {
    console.error("Error updating health status:", error);
    res.status(500).json({ error: "Error updating health status" });
  }
});

async function getReportPath(req, userId) {
  if (useR2 && req.file.buffer) {
    const ext = path.extname(req.file.originalname) || '.pdf';
    const key = `health_reports/user-${userId}-health-report-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    return await uploadToR2(req.file.buffer, key, req.file.mimetype);
  }
  return `health_reports/${req.file.filename}`;
}

router.post("/upload-health-report-doctor/:userId", isDoctor, upload.single('report'), async (req, res) => {
  try {
    const { userId } = req.params;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const reportPath = await getReportPath(req, userId);
    await db.promise().query("INSERT INTO health_reports (user_id, report_path) VALUES (?, ?)", [userId, reportPath]);
    await db.promise().query("UPDATE users SET health_status = 'pending' WHERE id = ?", [userId]);
    res.json({ success: true, message: "Health report uploaded successfully" });
  } catch (error) {
    console.error("Error uploading health report:", error);
    res.status(500).json({ error: "Error uploading health report" });
  }
});

// Deprecated: unauthenticated upload by userId. Use POST /api/member/upload-health-report with login instead.
router.post("/upload-health-report/:userId", (req, res) => {
  res.status(410).json({
    error: "This endpoint is no longer available. Please log in and use the health report upload page.",
    use: "POST /api/member/upload-health-report (with authentication)"
  });
});

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

// Download health report file (forces download with Content-Disposition: attachment)
router.get("/health-reports/:reportId/download", isDoctor, async (req, res) => {
  try {
    const { reportId } = req.params;
    const [reports] = await db.promise().query(
      "SELECT report_path FROM health_reports WHERE id = ?",
      [reportId]
    );
    if (reports.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    const reportPath = reports[0].report_path;
    const filename = path.basename(reportPath.split('?')[0]) || `health-report-${reportId}.pdf`;

    if (reportPath.startsWith('http')) {
      const resp = await axios.get(reportPath, { responseType: 'arraybuffer' });
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', resp.headers['content-type'] || 'application/octet-stream');
      res.send(Buffer.from(resp.data));
    } else {
      const fullPath = path.resolve(path.join(__dirname, '../uploads', reportPath));
      const uploadsDir = path.resolve(__dirname, '../uploads');
      if (!fullPath.startsWith(uploadsDir) || !fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "File not found" });
      }
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fullPath)}"`);
      res.sendFile(fullPath);
    }
  } catch (error) {
    console.error("Health report download error:", error);
    res.status(500).json({ error: "Download failed" });
  }
});

// Get health reports for a user
router.get("/health-reports/:userId", isDoctor, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [reports] = await db.promise().query(
      "SELECT * FROM health_reports WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    const workerUrl = process.env.R2_WORKER_URL;
    const transformed = reports.map(r => ({
      ...r,
      report_path: toWorkerUrlIfR2(r.report_path, workerUrl) || r.report_path
    }));
    
    res.json(transformed);
  } catch (error) {
    console.error("Error fetching health reports:", error);
    res.status(500).json({ error: "Error fetching health reports" });
  }
});

// Update health report status
router.put("/health-reports/:reportId", isDoctor, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, doctor_notes } = req.body;
    
    // Validate input
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    // Update report status
    await db.promise().query(
      "UPDATE health_reports SET status = ?, doctor_notes = ? WHERE id = ?",
      [status, doctor_notes, reportId]
    );
    
    // Get user info for email
    const [reportRows] = await db.promise().query(
      "SELECT user_id FROM health_reports WHERE id = ?",
      [reportId]
    );
    
    if (reportRows.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    
    const userId = reportRows[0].user_id;
    
    // Update user health status based on report status
    // When report is rejected: final rejection - user cannot participate (same as direct rejection)
    const healthStatus = status === 'approved' ? 'approved' : 'rejected';
    const healthStatusReason = status === 'approved' 
      ? 'Your health report has been approved' 
      : doctor_notes || 'Your health report did not meet our requirements. You are currently unable to participate in swimming activities.';
    
    await db.promise().query(
      "UPDATE users SET health_status = ?, health_status_reason = ? WHERE id = ?",
      [healthStatus, healthStatusReason, userId]
    );
    
    // Get user email
    const [userRows] = await db.promise().query(
      "SELECT email, name, surname FROM users WHERE id = ?",
      [userId]
    );
    
    if (userRows.length > 0) {
      const user = userRows[0];
      
      if (status === 'approved') {
        await sendHealthReportApprovedEmail(user.email, user.name, user.surname);
      } else {
        const rejectionReason = doctor_notes || 'Your health report did not meet our requirements.';
        await sendHealthRejectionEmail(user.email, user.name, user.surname, rejectionReason);
      }
    }
    
    res.json({ 
      success: true, 
      message: `Health report status updated to ${status}` 
    });
  } catch (error) {
    console.error("Error updating health report status:", error);
    res.status(500).json({ error: "Error updating health report status" });
  }
});

// Get users who need report review (those with status 'needs_report')
router.get("/users-with-reports", isDoctor, async (req, res) => {
  try {
    const [users] = await db.promise().query(`
      SELECT 
        u.id,
        u.name,
        u.surname,
        u.email,
        u.phone,
        u.date_of_birth,
        u.gender,
        u.health_status,
        h.blood_type,
        h.allergies,
        h.chronic_conditions,
        h.medications,
        h.height,
        h.weight
      FROM users u
      JOIN health_info h ON u.id = h.user_id
      WHERE u.verification_status = 'approved' 
      AND u.health_status = 'needs_report'
    `);
    
    res.json(users);
  } catch (error) {
    console.error("Error fetching users with reports:", error);
    res.status(500).json({ error: "Error fetching users with reports" });
  }
});

// Helper function to send email requesting additional health report
const sendHealthReportRequestEmail = async (email, firstName, lastName, reason, userId) => {
  try {
    const uploadUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/upload-health-report/${userId}`;

    await sendEmail({
      to: email,
      subject: "Additional Health Report Required",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">Additional Health Report Required</h2>
          
          <p>Dear ${escapeHtml(firstName)} ${escapeHtml(lastName)},</p>
          
          <p>After reviewing your health information, our medical team requires additional documentation to complete your health assessment.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Reason for Additional Documentation:</h3>
            <p style="margin-bottom: 0;">${escapeHtml(reason)}</p>
          </div>
          
          <p>Please click the button below to upload the requested health documentation:</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${uploadUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0077cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Upload Health Report</a>
          </div>
          
          <p>If you have any questions or need assistance, please contact our support team.</p>
          
          <p style="border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px; font-size: 0.9em; color: #777; text-align: center;">
            &copy; Swimming Pool Management System
          </p>
        </div>
      `
    });
    console.log(`Health report request email sent to ${email}`);
  } catch (error) {
    console.error('Error sending health report request email:', error);
    throw error;
  }
};

const sendHealthRejectionEmail = async (email, firstName, lastName, reason) => {
  try {
    await sendEmail({
      to: email,
      subject: "Health Assessment Status Update",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">Health Assessment Status Update</h2>
          
          <p>Dear ${escapeHtml(firstName)} ${escapeHtml(lastName)},</p>
          
          <p>After careful review of your health information, our medical team has determined that you are currently unable to participate in swimming activities at our facility.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e53935;">
            <h3 style="margin-top: 0; color: #333;">Reason:</h3>
            <p style="margin-bottom: 0;">${escapeHtml(reason)}</p>
          </div>
          

          
          <p>We prioritize the safety and well-being of all our members, and we appreciate your understanding.</p>
          
          <p>If you have any questions or need further clarification, please contact our support team.</p>
          
          <p style="border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px; font-size: 0.9em; color: #777; text-align: center;">
            &copy; Swimming Pool Management System
          </p>
        </div>
      `
    });
    console.log(`Health rejection email sent to ${email}`);
  } catch (error) {
    console.error('Error sending health rejection email:', error);
    throw error;
  }
};

// Helper function to send health report approved email
const sendHealthReportApprovedEmail = async (email, firstName, lastName) => {
  try {
    await sendEmail({
      to: email,
      subject: "Health Status Approved",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">Health Status Approved</h2>
          
          <p>Dear ${escapeHtml(firstName)} ${escapeHtml(lastName)},</p>
          
          <p>We are pleased to inform you that your health status has been <strong style="color: #4CAF50;">approved</strong>.</p>
          
          <p>You now have full access to all swimming sessions and can make reservations according to your purchased packages.</p>
          
          <p>If you have any questions or need assistance, please contact our support team.</p>
          
          <p style="border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px; font-size: 0.9em; color: #777; text-align: center;">
            &copy; Swimming Pool Management System
          </p>
        </div>
      `
    });
  } catch (error) {
    console.error("Error sending health report approved email:", error);
    throw error;
  }
};

// Helper function to send health report rejected email
const sendHealthReportRejectedEmail = async (email, firstName, lastName, reason) => {
  try {
    await sendEmail({
      to: email,
      subject: "Health Report Rejected",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">Health Report Feedback</h2>
          
          <p>Dear ${escapeHtml(firstName)} ${escapeHtml(lastName)},</p>
          
          <p>After reviewing your submitted health report, our medical team has determined that additional information is needed.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Doctor's Notes:</h3>
            <p style="margin-bottom: 0;">${escapeHtml(reason)}</p>
          </div>
          
          <p>Please log in to your account and submit a new health report addressing the concerns mentioned above.</p>
          
          <p>If you have any questions or need assistance, please contact our support team.</p>
          
          <p style="border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px; font-size: 0.9em; color: #777; text-align: center;">
            &copy; Swimming Pool Management System
          </p>
        </div>
      `
    });
  } catch (error) {
    console.error("Error sending health report rejected email:", error);
    throw error;
  }
};

// Endpoint to get a list of patients who need reminders and reminder history
router.get("/pending-health-report-reminders", isDoctor, async (req, res) => {
  try {
    // Get patients who need a reminder (report requested and no report uploaded)
    // Convert timestamps to Turkish time (UTC+3) and format them
    const [pendingReminders] = await db.promise().query(`
      SELECT 
        u.id, 
        u.name, 
        u.surname, 
        u.email, 
        u.health_status_reason, 
        u.health_report_requested_at,
        to_char(u.health_report_requested_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS') AS health_report_requested_at_formatted,
        ((u.health_report_requested_at + INTERVAL '5 days')::date - CURRENT_DATE) AS days_until_reminder
      FROM users u
      WHERE u.health_status = 'needs_report'
      AND u.health_report_requested_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM health_reports hr
        WHERE hr.user_id = u.id
        AND hr.created_at > u.health_report_requested_at
      )
      ORDER BY u.health_report_requested_at ASC
    `);

    // Get reminder history with formatted timestamps
    const [reminderHistory] = await db.promise().query(`
      SELECT 
        u.id, 
        u.name, 
        u.surname, 
        u.email, 
        u.health_report_reminder_sent_at,
        to_char(u.health_report_reminder_sent_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS') AS health_report_reminder_sent_at_formatted,
        EXISTS (
          SELECT 1 FROM health_reports hr 
          WHERE hr.user_id = u.id 
          AND hr.created_at > u.health_report_reminder_sent_at
        ) as has_uploaded_report
      FROM users u
      WHERE u.health_report_reminder_sent_at IS NOT NULL
      ORDER BY u.health_report_reminder_sent_at DESC
      LIMIT 50
    `);

    res.json({
      pendingReminders,
      reminderHistory
    });
  } catch (error) {
    console.error("Error fetching pending health report reminders:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get health reports for a specific user
router.get("/health-reports/:userId", isDoctor, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get all health reports for this user
    const [reports] = await db.promise().query(`
      SELECT 
        hr.id, 
        hr.user_id, 
        hr.report_path, 
        hr.created_at,
        hr.status,
        hr.rejected_reason,
        to_char(hr.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS') AS created_at_formatted
      FROM health_reports hr
      WHERE hr.user_id = ?
      ORDER BY hr.created_at DESC
    `, [userId]);
    
    res.json(reports);
  } catch (error) {
    console.error("Error fetching health reports:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
