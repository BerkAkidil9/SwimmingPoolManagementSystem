const express = require("express");
const router = express.Router();
const db = require("../db");
const nodemailer = require("nodemailer");
const { isAdmin, isDoctor } = require("../middleware/auth");

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send a reminder email for health report upload
const sendHealthReportReminderEmail = async (email, firstName, lastName, reason, userId) => {
  try {
    // Generate the upload URL with the correct route format
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const uploadUrl = `${frontendUrl}/upload-health-report/${userId}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reminder: Health Report Upload Pending",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">Reminder: Health Report Upload</h2>
          
          <p>Dear ${firstName} ${lastName},</p>
          
          <p>We noticed that you have not yet uploaded the health documentation requested by our medical team. To complete your health assessment and gain access to swimming activities, please upload the required documents at your earliest convenience.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Documentation Requested:</h3>
            <p style="margin-bottom: 0;">${reason}</p>
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
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Health report reminder email sent to ${email}`);
  } catch (error) {
    console.error('Error sending health report reminder email:', error);
    throw error;
  }
};

// Custom middleware to allow both doctors and admins to access this endpoint
const isDoctorOrAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "You must be logged in to access this resource" });
  }
  
  if (req.session.user.role === 'doctor' || req.session.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ error: "You must be a doctor or admin to access this resource" });
};

// API endpoint to check for pending health reports and send reminders
// This endpoint is protected and should only be called by doctors, admins, or a scheduled task
router.post("/send-health-report-reminders", isDoctorOrAdmin, async (req, res) => {
  try {
    // Find users who:
    // 1. Have 'needs_report' status
    // 2. Had a report requested more than 5 days ago
    // 3. Haven't uploaded any reports since the request
    const [users] = await db.promise().query(`
      SELECT u.id, u.name, u.surname, u.email, u.health_status_reason, u.health_report_requested_at
      FROM users u
      WHERE u.health_status = 'needs_report'
      AND u.health_report_requested_at IS NOT NULL
      AND DATEDIFF(CURRENT_TIMESTAMP, u.health_report_requested_at) >= 5
      AND NOT EXISTS (
        SELECT 1 FROM health_reports hr
        WHERE hr.user_id = u.id
        AND hr.created_at > u.health_report_requested_at
      )
    `);
    
    if (users.length === 0) {
      return res.json({ 
        message: "No pending health report reminders to send",
        remindersSent: [] 
      });
    }
    
    // Send reminder emails to each user
    const remindersSent = [];
    for (const user of users) {
      try {
        await sendHealthReportReminderEmail(
          user.email,
          user.name,
          user.surname,
          user.health_status_reason,
          user.id
        );
        
        // Update the reminder sent timestamp
        await db.promise().query(
          "UPDATE users SET health_report_reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ?",
          [user.id]
        );
        
        remindersSent.push({
          userId: user.id,
          email: user.email,
          name: `${user.name} ${user.surname}`,
          status: "sent"
        });
      } catch (error) {
        console.error(`Failed to send reminder to ${user.email}:`, error);
        remindersSent.push({
          userId: user.id,
          email: user.email,
          name: `${user.name} ${user.surname}`,
          status: "failed",
          error: error.message
        });
      }
    }
    
    res.json({
      message: `Sent ${remindersSent.filter(r => r.status === "sent").length} reminder emails`,
      remindersSent
    });
  } catch (error) {
    console.error("Error sending health report reminders:", error);
    res.status(500).json({ error: "Error sending health report reminders" });
  }
});

// API endpoint to send health report reminders to specific users
router.post("/send-specific-reminders", isDoctorOrAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        error: "Please provide at least one user ID",
        remindersSent: [] 
      });
    }
    
    // Get details of the specified users who need reports
    const [users] = await db.promise().query(`
      SELECT u.id, u.name, u.surname, u.email, u.health_status_reason, u.health_report_requested_at
      FROM users u
      WHERE u.id IN (?) 
      AND u.health_status = 'needs_report'
      AND u.health_report_requested_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM health_reports hr
        WHERE hr.user_id = u.id
        AND hr.created_at > u.health_report_requested_at
      )
    `, [userIds]);
    
    if (users.length === 0) {
      return res.json({ 
        message: "No selected users need health report reminders",
        remindersSent: [] 
      });
    }
    
    // Send reminder emails to each selected user
    const remindersSent = [];
    for (const user of users) {
      try {
        await sendHealthReportReminderEmail(
          user.email,
          user.name,
          user.surname,
          user.health_status_reason,
          user.id
        );
        
        // Update the reminder sent timestamp
        await db.promise().query(
          "UPDATE users SET health_report_reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ?",
          [user.id]
        );
        
        remindersSent.push({
          userId: user.id,
          email: user.email,
          name: `${user.name} ${user.surname}`,
          status: "sent"
        });
      } catch (error) {
        console.error(`Failed to send reminder to ${user.email}:`, error);
        remindersSent.push({
          userId: user.id,
          email: user.email,
          name: `${user.name} ${user.surname}`,
          status: "failed",
          error: error.message
        });
      }
    }
    
    res.json({
      message: `Sent ${remindersSent.filter(r => r.status === "sent").length} reminder emails to selected users`,
      remindersSent
    });
  } catch (error) {
    console.error("Error sending specific health report reminders:", error);
    res.status(500).json({ 
      error: "Error sending health report reminders",
      remindersSent: []
    });
  }
});

// Send an email notifying user that their document was invalid
const sendInvalidDocumentNotificationEmail = async (email, firstName, lastName, invalidReason, userId) => {
  try {
    // Generate the upload URL with the correct route format
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const uploadUrl = `${frontendUrl}/upload-health-report/${userId}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Health Report Document Invalid",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">Invalid Health Report Document</h2>
          
          <p>Dear ${firstName} ${lastName},</p>
          
          <p>Our medical team has reviewed your submitted health report document and determined that it does not meet our requirements for the following reason:</p>
          
          <div style="background-color: #fff5f5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="margin-top: 0; color: #dc3545;">Reason for Rejection:</h3>
            <p style="margin-bottom: 0;">${invalidReason}</p>
          </div>
          
          <p>Please upload a valid health report document as soon as possible to gain access to swimming activities.</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${uploadUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0077cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Upload Valid Health Report</a>
          </div>
          
          <p>If you have any questions or need assistance, please contact our support team.</p>
          
          <p style="border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px; font-size: 0.9em; color: #777; text-align: center;">
            &copy; Swimming Pool Management System
          </p>
        </div>
      `
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Invalid document notification email sent: ' + info.response);
    return info;
  } catch (error) {
    console.error('Error sending invalid document notification email:', error);
    throw error;
  }
};

// API endpoint to send invalid document notification emails
router.post("/send-invalid-document-notification", isDoctorOrAdmin, async (req, res) => {
  try {
    const { userId, invalidReason, reportId } = req.body;
    
    if (!userId || !invalidReason) {
      return res.status(400).json({ 
        error: "Missing required parameters",
        success: false
      });
    }
    
    // Get user information
    const [users] = await db.promise().query(
      "SELECT id, name, surname, email FROM users WHERE id = ?", 
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ 
        error: "User not found", 
        success: false 
      });
    }
    
    const user = users[0];
    
    // Mark the report as invalid if reportId is provided
    if (reportId) {
      await db.promise().query(
        "UPDATE health_reports SET status = 'invalid', rejected_reason = ? WHERE id = ?", 
        [invalidReason, reportId]
      );
    }
    
    // Update user health status to request a new report
    await db.promise().query(
      "UPDATE users SET health_status = 'needs_report', health_status_reason = ?, health_report_requested_at = CURRENT_TIMESTAMP WHERE id = ?",
      [`Previous document invalid: ${invalidReason}`, userId]
    );
    
    // Send the notification email
    await sendInvalidDocumentNotificationEmail(
      user.email,
      user.name,
      user.surname,
      invalidReason,
      userId
    );
    
    res.json({
      message: "Invalid document notification sent successfully",
      success: true
    });
  } catch (error) {
    console.error("Error sending invalid document notification:", error);
    res.status(500).json({ 
      error: "Error sending notification", 
      success: false 
    });
  }
});


// Export the router as the default export
module.exports = router;

// Export the email functions as properties
module.exports.sendHealthReportReminderEmail = sendHealthReportReminderEmail;
module.exports.sendInvalidDocumentNotificationEmail = sendInvalidDocumentNotificationEmail;
