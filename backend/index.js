const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const cron = require("node-cron");
require("dotenv").config();

const loginRoutes = require("./routes/login");
const landingPageRoutes = require("./routes/landingPage");
const db = require("./config/database");
const adminRoutes = require("./routes/admin");
const memberRoutes = require("./routes/member");
const paymentRoutes = require("./routes/payment");
const doctorRoutes = require("./routes/doctor");
const remindersRoutes = require("./routes/reminders");
const staffRoutes = require("./routes/staff");
const coachRoutes = require("./routes/coach");


const app = express();
const port = 3001;

// Upload directories setup
const idCardsDir = path.join(__dirname, "uploads", "id_cards");
const profilePhotosDir = path.join(__dirname, "uploads", "profile_photos");
const healthReportsDir = path.join(__dirname, "uploads", "health_reports");

[idCardsDir, profilePhotosDir, healthReportsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware setup - Allow multiple origins for dev (3000, 3002, etc.)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3002'
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins for development
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Custom file serving middleware
app.use("/uploads", (req, res, next) => {
  console.log("Requested file path:", req.path);
  // Remove any leading slashes from the path
  const filePath = req.path.replace(/^\/+/, '');
  const fullPath = path.join(__dirname, 'uploads', filePath);
  console.log("Full file path:", fullPath);
  
  if (fs.existsSync(fullPath)) {
    console.log("File found, serving:", fullPath);
    
    // Check if this is a download request
    if (req.query.download === 'true') {
      console.log("Sending as download");
      const filename = path.basename(fullPath);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    
    // Set appropriate content type headers for common file types
    const ext = path.extname(fullPath).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (ext === '.jpg' || ext === '.jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    }
    
    res.sendFile(fullPath);
  } else {
    console.log("File not found:", fullPath);
    res.status(404).send('File not found');
  }
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: true,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Debugging middleware
app.use((req, res, next) => {
  console.log("Session ID:", req.sessionID);
  console.log("Is Authenticated:", req.isAuthenticated?.());
  console.log("User:", req.user);
  next();
});

// Routes
app.use("/auth", require("./register"));
app.use("/auth", loginRoutes);
app.use("/api", landingPageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/member", memberRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/coach", coachRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  if (err.name === "MulterError") {
    return res.status(400).json({ error: "File upload error" });
  }
  res.status(500).json({ error: err.message || "Internal server error" });
});

// Database connection and server start
db.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
    return;
  }
  console.log("Connected to MySQL database");

  // Create a direct health report reminder function that bypasses the API for the scheduled task
  const sendHealthReportReminders = async () => {
    try {
      console.log('Running scheduled health report reminder check...');
      
      // Find users who need reminders directly from the database
      const [users] = await db.promise().query(`
        SELECT u.id, u.name, u.surname, u.email, u.health_status_reason, u.health_report_requested_at
        FROM users u
        WHERE u.health_status = 'needs_report'
        AND u.health_report_requested_at IS NOT NULL
        AND DATEDIFF(CURRENT_TIMESTAMP, u.health_report_requested_at) >= 5
        AND (u.health_report_reminder_sent_at IS NULL OR DATEDIFF(CURRENT_TIMESTAMP, u.health_report_reminder_sent_at) >= 7)
        AND NOT EXISTS (
          SELECT 1 FROM health_reports hr
          WHERE hr.user_id = u.id
          AND hr.created_at > u.health_report_requested_at
        )
      `);
      
      if (users.length === 0) {
        console.log('No users need health report reminders at this time');
        return;
      }
      
      // Send reminder emails
      let sentCount = 0;
      const nodemailer = require('nodemailer');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // Create nodemailer transporter
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      
      for (const user of users) {
        try {
          // Generate the upload URL
          const uploadUrl = `${frontendUrl}/health-report-upload?userId=${user.id}`;
          
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Reminder: Health Report Upload Pending",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">Reminder: Health Report Upload</h2>
                
                <p>Dear ${user.name} ${user.surname},</p>
                
                <p>We noticed that you have not yet uploaded the health documentation requested by our medical team. To complete your health assessment and gain access to swimming activities, please upload the required documents at your earliest convenience.</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Documentation Requested:</h3>
                  <p style="margin-bottom: 0;">${user.health_status_reason}</p>
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
          
          // Update the reminder sent timestamp
          await db.promise().query(
            "UPDATE users SET health_report_reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ?",
            [user.id]
          );
          
          sentCount++;
          console.log(`Health report reminder email sent to ${user.email}`);
        } catch (error) {
          console.error(`Failed to send reminder to ${user.email}:`, error);
        }
      }
      
      console.log(`Health report reminders sent: ${sentCount} of ${users.length}`);
    } catch (error) {
      console.error('Error running health report reminder task:', error);
    }
  };

  // Schedule health report reminder task to run every hour
  cron.schedule('0 * * * *', sendHealthReportReminders);
  
  // Also run once at startup to test or handle any pending reminders
  // Use timeout to make sure the server is fully initialized
  setTimeout(sendHealthReportReminders, 10000);

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log("Upload directories created at:");
    console.log(`- ID Cards: ${idCardsDir}`);
    console.log(`- Profile Photos: ${profilePhotosDir}`);
  });
});

// Graceful shutdown
process.on("SIGINT", () => {
  db.end((err) => {
    if (err) {
      console.error("Error closing database connection:", err);
    } else {
      console.log("Database connection closed.");
    }
    process.exit();
  });
});

module.exports = app;