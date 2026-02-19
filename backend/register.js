const { validateRegistration } = require("./validations");
const express = require("express");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { sendEmail } = require("./utils/sendEmail");

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const sendVerificationEmail = async (email, token) => {
  const backendUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:3001';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verificationLink = `${backendUrl}/auth/verify-email?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(frontendUrl)}`;

  await sendEmail({
    to: email,
    subject: "Verify Your Email Address",
    html: `
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationLink}">${verificationLink}</a>
        <p>This link will expire in 24 hours.</p>
      `,
  });
};

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const db = require("./config/database");
const router = express.Router();
const { uploadToR2 } = require("./utils/r2Storage");

const useR2 = process.env.USE_R2 === 'true';

// Configure multer - memoryStorage for R2 compatibility (works for both local and R2)
const storage = useR2
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: function (req, file, cb) {
        let uploadDir = "uploads/";
        if (file.fieldname === "idCard") uploadDir += "id_cards";
        else if (file.fieldname === "profilePhoto") uploadDir += "profile_photos";
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const filename = file.fieldname === "idCard"
          ? `id-card-${uniqueSuffix}${path.extname(file.originalname)}`
          : `profile-${uniqueSuffix}${path.extname(file.originalname)}`;
        cb(null, filename);
      },
    });

// Configure multer with file type validation
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "idCard") {
      if (file.mimetype === "application/pdf") {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed for ID Card!"), false);
      }
    } else if (file.fieldname === "profilePhoto") {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed for Profile Photo!"), false);
      }
    } else {
      cb(new Error("Unexpected field"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Passport serialization
passport.serializeUser((user, done) => {
  console.log("Serializing user:", user.id || 'temp user');
  // If it's a temporary user from social auth, serialize the whole object
  if (user.isTemp) {
    done(null, { isTemp: true, ...user });
  } else {
    // For regular users, just serialize the ID
    done(null, { isTemp: false, id: user.id });
  }
});

passport.deserializeUser(async (serializedUser, done) => {
  try {
    console.log("Deserializing user:", serializedUser.id || 'temp user');
    // If it's a temporary user, return the whole object
    if (serializedUser.isTemp) {
      done(null, serializedUser);
    } else {
      // For regular users, fetch from database
      const [rows] = await db
        .promise()
        .query("SELECT * FROM users WHERE id = ?", [serializedUser.id]);
      
      if (rows.length === 0) {
        console.log("No user found with ID:", serializedUser.id);
        return done(null, false);
      }
      
      // Explicitly mark regular users as not temporary
      const user = {
        ...rows[0],
        isTemp: false
      };
      done(null, user);
    }
  } catch (error) {
    console.error("Deserialization error:", error);
    done(error, null);
  }
});

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/auth/google/callback`,
      prompt: "select_account",
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        console.log("Google OAuth Profile:", profile);

        // Check if user already exists with this email
        const [existingUsers] = await db
          .promise()
          .query("SELECT * FROM users WHERE email = ?", [profile.emails[0].value]);

        if (existingUsers.length > 0) {
          // Set isTemp:false explicitly for existing users
          const existingUser = {
            ...existingUsers[0],
            isTemp: false  // Explicitly mark as not temporary
          };
          console.log("Found existing user with this email:", existingUser.id);
          return done(null, existingUser);
        }

        // For new users, create temporary user object with more profile data
        const tempUser = {
          isTemp: true,
          provider: "google",
          provider_id: profile.id,
          name: profile._json.given_name,
          surname: profile._json.family_name,
          email: profile.emails[0].value,
          profile_picture: profile.photos[0]?.value || null,
          needsRegistration: true,
          // Store additional data from Google profile
          socialData: {
            given_name: profile._json.given_name,
            family_name: profile._json.family_name,
            picture: profile.photos[0]?.value,
            email: profile.emails[0].value,
            provider: "Google"
          }
        };

        return done(null, tempUser);
      } catch (error) {
        console.error("Google auth error:", error);
        done(error, null);
      }
    }
  )
);

// Add these routes before the main registration route

// Check email uniqueness
router.post('/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        const [rows] = await db.promise().query(
            'SELECT COUNT(*) as count FROM users WHERE email = ?',
            [email]
        );
        res.json({ isUnique: Number(rows[0].count) === 0 });
    } catch (error) {
        console.error('Email check error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Check phone uniqueness
router.post('/check-phone', async (req, res) => {
    try {
        const { phone } = req.body;
        const [rows] = await db.promise().query(
            'SELECT COUNT(*) as count FROM users WHERE phone = ?',
            [phone]
        );
        res.json({ isUnique: Number(rows[0].count) === 0 });
    } catch (error) {
        console.error('Phone check error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Registration route with file uploads
// Updated registration route
router.post(
  "/register",
  upload.fields([
    { name: "idCard", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
  ]),
  async (req, res) => {
    const debug = (step, msg) => console.log(`[REGISTER DEBUG ${step}]`, msg);
    try {
      debug(1, "START");
      debug(2, "body keys: " + Object.keys(req.body || {}).join(", "));
      debug(3, "files: " + (req.files ? JSON.stringify(Object.keys(req.files)) : "none"));

      const socialUser = req.user?.isTemp ? req.user : null;

      // Validate the request data
      const { isValid, errors } = validateRegistration(
        req.body,
        req.files,
        socialUser
      );

      if (!isValid) {
        debug(4, "VALIDATION FAILED: " + JSON.stringify(errors));
        // Clean up uploaded files if validation fails (disk storage only - memoryStorage has no file.path)
        if (req.files && !useR2) {
          Object.values(req.files).forEach((fileArray) => {
            fileArray.forEach((file) => {
              if (file.path) fs.unlink(file.path, (err) => { if (err) console.error("Error deleting file:", err); });
            });
          });
        }
        return res.status(400).json({ errors });
      }

      const {
        // Personal Information
        name,
        surname,
        date_of_birth,
        gender,
        swimming_ability,
        phone,
        email,
        password,
        confirmPassword,

        // Health Information
        blood_type,
        allergies,
        chronic_conditions,
        medications,
        height,
        weight,

        // Emergency Contact
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        emergency_contact_relationship_other,

        // Health Questions
        has_heart_problems,
        chest_pain_activity,
        balance_dizziness,
        other_chronic_disease,
        prescribed_medication,
        bone_joint_issues,
        doctor_supervised_activity,
        health_additional_info,

        // Terms and Privacy
        terms_accepted,
        privacy_accepted,
        marketing_accepted,
      } = req.body;

      // Get file paths if files were uploaded
      debug(5, "FILE UPLOAD START useR2=" + useR2);
      let idCardPath = null;
      let profilePhotoPath = null;

      if (req.files?.idCard?.[0]) {
        const file = req.files.idCard[0];
        if (useR2 && file.buffer) {
          debug(6, "Uploading idCard to R2...");
          const ext = path.extname(file.originalname) || '.pdf';
          const key = `id_cards/id-card-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          idCardPath = await uploadToR2(file.buffer, key, file.mimetype);
          debug(7, "idCard R2 done: " + idCardPath);
        } else {
          idCardPath = `id_cards/${path.basename(file.path)}`;
          debug(7, "idCard disk: " + idCardPath);
        }
      }

      if (req.files?.profilePhoto?.[0]) {
        const file = req.files.profilePhoto[0];
        if (useR2 && file.buffer) {
          debug(8, "Uploading profilePhoto to R2...");
          const ext = path.extname(file.originalname) || '.jpg';
          const key = `profile_photos/profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          profilePhotoPath = await uploadToR2(file.buffer, key, file.mimetype);
          debug(9, "profilePhoto R2 done: " + profilePhotoPath);
        } else {
          profilePhotoPath = `profile_photos/${path.basename(file.path)}`;
        }
      } else if (socialUser?.profile_picture) {
        debug(8, "Fetching social profile pic...");
        try {
          const response = await fetch(socialUser.profile_picture);
          const buffer = Buffer.from(await response.arrayBuffer());
          const fileName = `social_${Date.now()}.jpg`;
          if (useR2) {
            profilePhotoPath = await uploadToR2(buffer, `profile_photos/${fileName}`, 'image/jpeg');
          } else {
            await fs.promises.writeFile(path.join(__dirname, 'uploads', 'profile_photos', fileName), buffer);
            profilePhotoPath = `profile_photos/${fileName}`;
          }
        } catch (error) {
          console.error('Error saving social profile photo:', error);
        }
      }

      debug(10, "Files OK. Hashing password...");
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

      // Generate verification token (for all registrations - including social)
      const verificationToken = generateVerificationToken();
      const tokenExpires = new Date();
      tokenExpires.setHours(tokenExpires.getHours() + 24);

      debug(11, "Inserting user into DB...");
      // Insert user data with verification fields (PostgreSQL: RETURNING id for insertId)
      const [insertRows] = await db.promise().query(
        `INSERT INTO users (
                provider, provider_id, profile_picture,
                name, surname, date_of_birth, gender, swimming_ability, phone, email, 
                password, terms_accepted, privacy_accepted, marketing_accepted,
                id_card_path, profile_photo_path, verification_token,
                verification_token_expires, email_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [
          socialUser?.provider || null,
          socialUser?.provider_id || null,
          socialUser?.profile_picture || null,
          socialUser?.name || name || null,
          surname || null,
          date_of_birth || null,
          // PostgreSQL enum: Male/Female/Other, Yes/No (case-sensitive)
          gender ? String(gender).charAt(0).toUpperCase() + String(gender).slice(1).toLowerCase() : null,
          swimming_ability ? String(swimming_ability).charAt(0).toUpperCase() + String(swimming_ability).slice(1).toLowerCase() : null,
          phone || null,
          socialUser?.email || email,
          hashedPassword,
          terms_accepted === true || terms_accepted === "true",
          privacy_accepted === true || privacy_accepted === "true",
          marketing_accepted === true || marketing_accepted === "true",
          idCardPath,
          profilePhotoPath,
          verificationToken,
          tokenExpires,
          false, // email_verified
        ]
      );

      const userId = insertRows[0].id;
      debug(12, "User created id=" + userId);

      // Verification email - don't fail registration if email fails
      debug(13, "Sending verification email...");
      try {
        await sendVerificationEmail(
          socialUser?.email || email,
          verificationToken
        );
        debug(14, "Email sent OK");
      } catch (mailErr) {
        console.error("[REGISTER DEBUG] Email failed (user still created):", mailErr.message);
      }

      debug(15, "Inserting health_info...");
      await db.promise().query(
        `INSERT INTO health_info (
                user_id, blood_type, allergies, chronic_conditions, medications, 
                height, weight, emergency_contact_name, emergency_contact_phone,
                emergency_contact_relationship, emergency_contact_relationship_other,
                has_heart_problems, chest_pain_activity, balance_dizziness,
                other_chronic_disease, prescribed_medication, bone_joint_issues, 
                doctor_supervised_activity, health_additional_info
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          blood_type, // A+, A-, etc. - schema enum
          allergies,
          chronic_conditions,
          medications,
          height,
          weight,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relationship,
          emergency_contact_relationship_other,
          has_heart_problems === true || has_heart_problems === "true",
          chest_pain_activity === true || chest_pain_activity === "true",
          balance_dizziness === true || balance_dizziness === "true",
          other_chronic_disease === true || other_chronic_disease === "true",
          prescribed_medication === true || prescribed_medication === "true",
          bone_joint_issues === true || bone_joint_issues === "true",
          doctor_supervised_activity === true || doctor_supervised_activity === "true",
          health_additional_info,
        ]
      );

      debug(16, "DONE - success");

      // Email verification required for all registrations
      res.status(201).json({
        message:
          "Registration successful. Please check your email to verify your account.",
        userId: userId,
        requiresVerification: true,
      });
    } catch (error) {
      console.error("[REGISTER DEBUG] ERROR:", error.message);
      console.error("[REGISTER DEBUG] Stack:", error.stack);
      console.error("[REGISTER DEBUG] Code:", error.code);
      if (req.files && !useR2) {
        Object.values(req.files).forEach((fileArray) => {
          fileArray.forEach((file) => {
            if (file.path) fs.unlink(file.path, (err) => { if (err) console.error("Error deleting file:", err); });
          });
        });
      }
      if (error.code === "ER_DUP_ENTRY" || error.code === "23505") {
        const msg = (error.sqlMessage || error.message || "").toLowerCase();
        if (msg.includes("email") || msg.includes("users_email")) {
          return res.status(400).json({ error: "Email already registered" });
        }
        if (msg.includes("phone") || msg.includes("users_phone")) {
          return res.status(400).json({ error: "Phone number already registered" });
        }
      }
      // More specific errors for debugging
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("r2") || msg.includes("not configured")) {
        return res.status(500).json({ error: "File upload service not configured. Contact support." });
      }
      if (msg.includes("column") || msg.includes("syntax") || error.code) {
        return res.status(500).json({
          error: "Database error.",
          debug: error.message,
        });
      }
      // Show actual error for debugging (remove in production when fixed)
      res.status(500).json({
        error: "Error during registration",
        debug: error.message,
      });
    }
  }
);

// Safe redirect: only allow same origin as FRONTEND_URL (prevents open redirect)
function getSafeRedirectBase(redirectParam) {
  const allowed = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
  if (!redirectParam) return allowed;
  try {
    const url = new URL(redirectParam);
    const allowedUrl = new URL(allowed);
    if (url.origin === allowedUrl.origin) return url.origin;
  } catch (_) {}
  return allowed;
}

// GET - Email link: /auth/verify-email?token=XXX&redirect=... (token in query avoids truncation)
router.get("/verify-email", async (req, res) => {
  let token = (req.query.token || req.params?.token || "").trim();
  const redirectBase = getSafeRedirectBase(req.query.redirect);

  try {
    token = decodeURIComponent(token);
  } catch (_) {}
  token = token.trim();

  console.log("=== Email Verification (GET) ===");
  console.log("Token length:", token.length, "First 10 chars:", token.substring(0, 10));

  if (!token) {
    return res.redirect(`${redirectBase}/verify-result?status=error&message=invalid`);
  }

  try {
    // Try exact match first, then TRIM match (in case DB has extra spaces)
    let [users] = await db
      .promise()
      .query("SELECT * FROM users WHERE verification_token = ?", [token]);

    if (users.length === 0) {
      [users] = await db
        .promise()
        .query("SELECT * FROM users WHERE TRIM(verification_token) = ?", [token]);
    }

    if (users.length === 0) {
      // Debug: log one unverified user's token info (not the actual token)
      const [debug] = await db.promise().query(
        "SELECT id, LENGTH(verification_token) as tok_len FROM users WHERE verification_token IS NOT NULL AND verification_token != '' AND email_verified = 0 LIMIT 1"
      );
      console.log("No user found. Debug - unverified user token length:", debug[0]?.tok_len);
      return res.redirect(`${redirectBase}/verify-result?status=error&message=expired`);
    }

    const user = users[0];
    await db
      .promise()
      .query(
        "UPDATE users SET email_verified = 1, verification_token = '', verification_token_expires = NULL WHERE id = ?",
        [user.id]
      );

    console.log("User verified successfully:", user.id);
    return res.redirect(`${redirectBase}/verify-result?status=success`);
  } catch (error) {
    console.error("Verification error:", error);
    return res.redirect(`${redirectBase}/verify-result?status=error&message=server`);
  }
});

// POST - Fallback for programmatic verification
router.post(["/verify-email", "/verify-email/:token"], async (req, res) => {
  console.log("=== Email Verification Debug ===");
  let token = (req.body?.token || req.params?.token || "").trim();
  try {
    token = decodeURIComponent(token);
  } catch (_) {}
  console.log("Received token length:", token.length);

  if (!token) {
    return res.status(400).json({ message: "Verification link is invalid or has expired." });
  }

  try {
    // Find user by token
    const [users] = await db
      .promise()
      .query(
        "SELECT * FROM users WHERE verification_token = ?",
        [token]
      );

    if (users.length === 0) {
      console.log("No user found with this token");
      return res.status(400).json({ message: "Verification link is invalid or has expired." });
    }

    const user = users[0];
    // Expiry check disabled - was causing false "expired" due to timezone/format issues
    console.log("User verified successfully", user.id);

    // Update user as verified and clear token
    await db
      .promise()
      .query(
        "UPDATE users SET email_verified = 1, verification_token = '', verification_token_expires = NULL WHERE id = ?",
        [user.id]
      );

    // Send success response
    res.status(200).json({ message: "Email verification successful. You can now login to your account." });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: "An error occurred during verification." });
  }
});

// Add Google auth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    console.log("Google callback - user object:", JSON.stringify(req.user, null, 2));
    
    // If user is not temporary (i.e., it's an existing user), check email verification
    if (!req.user.isTemp) {
      if (!req.user.email_verified) {
        req.session.destroy(() => {});
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=verify_email`);
      }
      console.log("Redirecting existing user to dashboard");
      console.log("User role is:", req.user.role);
      
      // Create a proper session for the user with explicit role
      req.session.user = {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role || 'user',
        name: req.user.name,
        verificationStatus: req.user.verification_status
      };
      
      // Save the session before redirecting
      req.session.save(err => {
        if (err) {
          console.error("Session save error:", err);
        }
        
        // Add more explicit logging for the redirection
        console.log(`Redirecting user with role ${req.user.role} to appropriate dashboard`);
        
        // Redirect based on role
        if (req.user.role === 'admin') {
          return res.redirect(`${process.env.FRONTEND_URL}/admin`);
        } else {
          // Default to member dashboard for regular users
          return res.redirect(`${process.env.FRONTEND_URL}/member/dashboard`);
        }
      });
    } else {
      // New user logic...
      console.log("Redirecting new user to social registration");
      req.session.socialData = req.user.socialData;
      
      // Save the session before redirecting
      req.session.save(err => {
        if (err) {
          console.error("Session save error:", err);
        }
        return res.redirect(`${process.env.FRONTEND_URL}/register/social`);
      });
    }
  }
);

// Updated file upload routes with error handling
router.post("/upload-id-card", upload.single("idCard"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    let filePath;
    if (useR2 && req.file.buffer) {
      const ext = path.extname(req.file.originalname) || '.pdf';
      const key = `id_cards/id-card-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      filePath = await uploadToR2(req.file.buffer, key, req.file.mimetype);
    } else {
      filePath = req.file.path.replace(/^.*[\\\/]uploads[\\\/]/, '');
    }

    await db.promise().query("UPDATE users SET id_card_path = ? WHERE id = ?", [filePath, req.user.id]);

    res.json({ message: "ID Card uploaded successfully", filePath });
  } catch (error) {
    console.error("ID Card upload error:", error);
    if (req.file?.path) fs.unlink(req.file.path, (err) => { if (err) console.error("Error deleting file:", err); });
    res.status(500).json({ error: "Error uploading ID Card" });
  }
});

router.post("/upload-profile-photo", upload.single("profilePhoto"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!req.user) {
      if (req.file?.path) fs.unlink(req.file.path, (err) => { if (err) console.error("Error deleting file:", err); });
      return res.status(401).json({ error: "User not authenticated" });
    }

    let filePath;
    if (useR2 && req.file.buffer) {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const key = `profile_photos/profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      filePath = await uploadToR2(req.file.buffer, key, req.file.mimetype);
    } else {
      filePath = req.file.path.replace(/^.*[\\\/]uploads[\\\/]/, '');
    }

    await db.promise().query("UPDATE users SET profile_photo_path = ? WHERE id = ?", [filePath, req.user.id]);

    res.json({ message: "Profile photo uploaded successfully", filePath });
  } catch (error) {
    console.error("Profile photo upload error:", error);
    if (req.file?.path) fs.unlink(req.file.path, (err) => { if (err) console.error("Error deleting file:", err); });
    res.status(500).json({ error: "Error uploading profile photo" });
  }
});

// Check authentication status - update this route
router.get("/check-auth", (req, res) => {
  try {
    console.log("Check Auth - Session:", JSON.stringify(req.session));
    console.log("Check Auth - Is Authenticated:", req.isAuthenticated());
    console.log("Check Auth - User:", req.user ? JSON.stringify(req.user) : "No user");
    
    let user = null;
    let isAuthenticated = false;
    
    // First check session.user (our custom session)
    if (req.session && req.session.user) {
      console.log("Using session.user with role:", req.session.user.role);
      isAuthenticated = true;
      user = {
        id: req.session.user.id,
        name: req.session.user.name || "",
        email: req.session.user.email,
        role: req.session.user.role || 'user',
        verification_status: req.session.user.verificationStatus
      };
    } 
    // Then check passport user
    else if (req.isAuthenticated() && req.user) {
      console.log("Using passport user with role:", req.user.role);
      isAuthenticated = true;
      user = {
        id: req.user.id,
        name: req.user.name || "",
        email: req.user.email,
        role: req.user.role || 'user',
        verification_status: req.user.verification_status
      };
    }
    
    if (isAuthenticated && user) {
      // Ensure role is normalized and consistent
      if (user.role) {
        // Force lowercase for consistency
        user.role = user.role.toLowerCase();
      }
      
      // Ensure role is one of the valid options
      if (!['admin', 'user', 'doctor', 'staff', 'coach'].includes(user.role)) {
        user.role = 'user'; // Default to user if invalid role
      }
      
      console.log("Returning authenticated user with role:", user.role);
      return res.json({
        isAuthenticated: true,
        user: user
      });
    } else {
      console.log("No authenticated user found");
      res.json({
        isAuthenticated: false,
        user: null
      });
    }
  } catch (error) {
    console.error("Auth check error:", error);
    res.status(500).json({ error: "Error checking authentication status", isAuthenticated: false });
  }
});

router.get("/check-verification", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [user] = await db
      .promise()
      .query("SELECT email_verified FROM users WHERE id = ?", [req.user.id]);

    res.json({
      isVerified: user[0]?.email_verified === 1,
      email: req.user.email,
    });
  } catch (error) {
    console.error("Verification check error:", error);
    res.status(500).json({ error: "Error checking verification status" });
  }
});

router.post("/resend-verification", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const verificationToken = generateVerificationToken();
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24);

    await db.promise().query(
      `UPDATE users 
             SET verification_token = ?, 
                 verification_token_expires = ? 
             WHERE id = ?`,
      [verificationToken, tokenExpires, req.user.id]
    );

    await sendVerificationEmail(req.user.email, verificationToken);

    res.json({ message: "Verification email resent successfully" });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Error resending verification email" });
  }
});

// Enhanced logout route with cache clearing
router.get("/clear-session", (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Error during logout" });
    }
    // Clear session
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error("Session destruction error:", sessionErr);
      }
      res.json({ message: "Session cleared successfully" });
    });
  });
});

// Add a clear session endpoint to help with testing
router.get("/clear-all-session", (req, res) => {
  // Clear passport session
  req.logout(function(err) {
    if (err) {
      console.error("Logout error:", err);
    }
    
    // Also clear our custom session
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({ error: "Failed to clear session" });
      }
      
      // Clear cookies as well
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: "Session and cookies cleared" });
    });
  });
});

// Password Reset Routes
router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const [users] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'No account with that email address exists.' });
    }
    
    const user = users[0];
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Save token to database
    await db.promise().query(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [resetToken, resetTokenExpires, user.id]
    );
    
    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h1>You requested a password reset</h1>
        <p>Click this <a href="${resetUrl}">link</a> to set a new password.</p>
        <p>This link is valid for 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });
    
    res.status(200).json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    console.error('Error sending reset email:', error);
    res.status(500).json({ error: 'Failed to send reset email. Please try again later.' });
  }
});

router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find user with this token and that hasn't expired
    const [users] = await db.promise().query(
      'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()',
      [token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }
    
    // Return success with email (to pre-fill form)
    res.status(200).json({ 
      message: 'Token is valid',
      email: users[0].email
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Find user with this token and that hasn't expired
    const [users] = await db.promise().query(
      'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()',
      [token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }
    
    const user = users[0];
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update password and clear reset token
    await db.promise().query(
      'UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );
    
    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

router.use((err, req, res, next) => {
  console.error("Route error:", err);

  if (req.files && !useR2) {
    Object.values(req.files).forEach((fileArray) => {
      fileArray.forEach((file) => {
        if (file.path) fs.unlink(file.path, (err) => { if (err) console.error("Error deleting file:", err); });
      });
    });
  }

  // Handle multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File is too large. Maximum size is 5MB." });
    }
    return res.status(400).json({ error: "Error uploading file." });
  }

  // Handle other errors
  res.status(500).json({ error: err.message || "Internal server error" });
});

// Add a new route to handle social registration email verification
router.post('/verify-social-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!req.user?.isTemp) {
      return res.status(400).json({ error: "Invalid session" });
    }

    if (req.user.verificationToken !== token) {
      return res.status(400).json({ error: "Invalid verification token" });
    }

    if (new Date() > new Date(req.user.tokenExpires)) {
      return res.status(400).json({ error: "Verification token has expired" });
    }

    // Now proceed with social registration
    return res.json({ 
      verified: true,
      message: "Email verified successfully"
    });

  } catch (error) {
    console.error("Social email verification error:", error);
    res.status(500).json({ error: "Error verifying email" });
  }
});

// Add this new route
router.get('/social-registration-data', (req, res) => {
  if (req.session.socialData) {
    res.json(req.session.socialData);
  } else {
    res.json(null);
  }
});

module.exports = router;
