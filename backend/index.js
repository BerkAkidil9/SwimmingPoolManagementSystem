const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const passport = require("passport");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const cron = require("node-cron");
require("dotenv").config();
const { escapeHtml } = require("./utils/security");

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
const port = process.env.PORT || 3001;

// Trust proxy (Render puts app behind reverse proxy - needed for correct secure cookies)
app.set('trust proxy', 1);

// Security headers
const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", frontendOrigin, "https://api.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Upload directories setup
const idCardsDir = path.join(__dirname, "uploads", "id_cards");
const profilePhotosDir = path.join(__dirname, "uploads", "profile_photos");
const healthReportsDir = path.join(__dirname, "uploads", "health_reports");

[idCardsDir, profilePhotosDir, healthReportsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware setup - Allow multiple origins for dev and production
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3002',
  'https://swimcenter.onrender.com'
].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV === 'production') {
        callback(null, false);
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

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || typeof sessionSecret !== 'string' || sessionSecret.trim() === '') {
  throw new Error('SESSION_SECRET environment variable is required. Set it in .env (e.g. a long random string).');
}
app.use(
  session({
    store: new pgSession({
      pool: db.pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Custom file serving middleware (path traversal protection + authentication + authorization)
app.use("/uploads", async (req, res, next) => {
  const user = req.session?.user || (req.isAuthenticated?.() && req.user);
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const filePath = req.path.replace(/^\/+/, '');
  const uploadsDir = path.resolve(__dirname, 'uploads');
  const fullPath = path.resolve(path.join(__dirname, 'uploads', filePath));
  if (!fullPath.startsWith(uploadsDir + path.sep) && fullPath !== uploadsDir) {
    return res.status(403).send('Forbidden');
  }

  // Authorization: restrict file access based on role and ownership
  const userRole = (user.role || 'user').toLowerCase();
  const userId = user.id;

  if (userRole !== 'admin') {
    if (userRole === 'doctor' && filePath.startsWith('health_reports/')) {
      // Doctors can access health reports
    } else {
      // Regular users / staff / coach: only own files
      try {
        const [owned] = await db.promise().query(
          `SELECT id FROM users WHERE id = ? AND (id_card_path = ? OR profile_photo_path = ?)
           UNION
           SELECT user_id AS id FROM health_reports WHERE user_id = ? AND report_path = ?`,
          [userId, filePath, filePath, userId, filePath]
        );
        if (owned.length === 0) {
          return res.status(403).json({ error: "Access denied" });
        }
      } catch (err) {
        console.error("Upload authorization check error:", err);
        return res.status(500).json({ error: "Server error" });
      }
    }
  }

  if (fs.existsSync(fullPath)) {
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const sanitizeFilename = (name) => name.replace(/[^\w.\-]/g, '_');

    if (req.query.download === 'true') {
      const filename = sanitizeFilename(path.basename(fullPath));
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    
    const SAFE_CONTENT_TYPES = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = SAFE_CONTENT_TYPES[ext];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(path.basename(fullPath))}"`);
    }
    
    res.sendFile(fullPath);
  } else {
    res.status(404).send('File not found');
  }
});

// Debugging middleware - only in non-production to avoid leaking session/user to logs
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log("Session ID:", req.sessionID);
    console.log("Is Authenticated:", req.isAuthenticated?.());
    console.log("User:", req.user);
    next();
  });
}

// Public pools endpoint at /pools (some ad blockers block /api/*)
app.get("/pools", async (req, res) => {
  try {
    const [pools] = await db.promise().query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM sessions s 
         WHERE s.pool_id = p.id AND s.type = 'education' AND s.session_date >= (NOW() AT TIME ZONE 'Europe/Istanbul')::date) as education_sessions,
        (SELECT COUNT(*) FROM sessions s 
         WHERE s.pool_id = p.id AND s.type = 'free_swimming' AND s.session_date >= (NOW() AT TIME ZONE 'Europe/Istanbul')::date) as free_swimming_sessions
      FROM "Pools" p
    `);
    res.json(pools);
  } catch (err) {
    console.error("Error fetching pools:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Routes - login first so POST /auth/login is never handled by register
app.use("/auth", loginRoutes);
app.use("/auth", require("./register"));
app.use("/api", landingPageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/member", memberRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/coach", coachRoutes);


// Error handling middleware (do not expose err.message to client)
app.use((err, req, res, next) => {
  console.error("Error:", err);
  if (err.name === "MulterError") {
    return res.status(400).json({ error: "File upload error" });
  }
  res.status(500).json({ error: "Internal server error" });
});

// Production: DATABASE_URL must be set (Neon connection string)
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is not set. Render Dashboard -> swimcenter-api -> Environment -> Add DATABASE_URL (Neon connection string).");
}

// Database connection and server start
db.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
    return;
  }
  console.log("Connected to PostgreSQL database");

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
        AND ((NOW() AT TIME ZONE 'Europe/Istanbul')::date - (u.health_report_requested_at AT TIME ZONE 'Europe/Istanbul')::date) >= 5
        AND (u.health_report_reminder_sent_at IS NULL OR ((NOW() AT TIME ZONE 'Europe/Istanbul')::date - (u.health_report_reminder_sent_at AT TIME ZONE 'Europe/Istanbul')::date) >= 7)
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
      
      // Send reminder emails (uses Resend on Render, nodemailer locally)
      let sentCount = 0;
      const { sendEmail } = require('./utils/sendEmail');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      for (const user of users) {
        try {
          // Generate the upload URL
          const uploadUrl = `${frontendUrl}/health-report-upload?userId=${user.id}`;

          await sendEmail({
            to: user.email,
            subject: "Reminder: Health Report Upload Pending",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">Reminder: Health Report Upload</h2>
                
                <p>Dear ${escapeHtml(user.name)} ${escapeHtml(user.surname)},</p>
                
                <p>We noticed that you have not yet uploaded the health documentation requested by our medical team. To complete your health assessment and gain access to swimming activities, please upload the required documents at your earliest convenience.</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Documentation Requested:</h3>
                  <p style="margin-bottom: 0;">${escapeHtml(user.health_status_reason)}</p>
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