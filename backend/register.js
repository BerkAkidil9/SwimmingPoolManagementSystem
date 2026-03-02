const { validateRegistration } = require("./validations");
const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { sendEmail } = require("./utils/sendEmail");
const { hashToken, validatePasswordStrength } = require("./utils/security");
const { isAuthenticated, getCurrentUser, getCurrentUserId } = require("./middleware/auth");

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const sendVerificationEmail = async (email, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  // Token in hash fragment only - not sent in Referer or server logs (security)
  const verificationLink = `${frontendUrl}/verify-email#token=${encodeURIComponent(token)}`;

  await sendEmail({
    to: email,
    subject: "Verify Your Email Address",
    html: `
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationLink}">Verify my email</a>
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

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "idCard") {
      const ext = path.extname(file.originalname).toLowerCase();
      if (file.mimetype !== "application/pdf" || ext !== '.pdf') {
        return cb(new Error("Only PDF files are allowed for ID Card!"), false);
      }
      cb(null, true);
    } else if (file.fieldname === "profilePhoto") {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_IMAGE_MIMES.has(file.mimetype) || !ALLOWED_IMAGE_EXTS.has(ext)) {
        return cb(new Error("Only image files (jpg, png, gif, webp) are allowed for Profile Photo!"), false);
      }
      cb(null, true);
    } else {
      cb(new Error("Unexpected field"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const _isDev = process.env.NODE_ENV !== 'production';

// Passport serialization
passport.serializeUser((user, done) => {
  if (_isDev) console.log("Serializing user:", user.id || 'temp user');
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
    if (_isDev) console.log("Deserializing user:", serializedUser.id || 'temp user');
    if (serializedUser.isTemp) {
      done(null, serializedUser);
    } else {
      const [rows] = await db
        .promise()
        .query(
          `SELECT id, name, surname, email, role, verification_status,
                  email_verified, health_status, profile_photo_path
           FROM users WHERE id = ?`,
          [serializedUser.id]
        );
      
      if (rows.length === 0) {
        if (_isDev) console.log("No user found with ID:", serializedUser.id);
        return done(null, false);
      }
      
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
        if (_isDev) console.log("Google OAuth Profile:", profile.id);

        const [existingUsers] = await db
          .promise()
          .query(
            `SELECT id, name, surname, email, role, verification_status,
                    email_verified, health_status, profile_photo_path
             FROM users WHERE email = ?`,
            [profile.emails[0].value]
          );

        if (existingUsers.length > 0) {
          const existingUser = {
            ...existingUsers[0],
            isTemp: false
          };
          if (_isDev) console.log("Found existing user:", existingUser.id);
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

// Rate limiter for uniqueness checks (prevents user enumeration at scale)
const checkUniquenessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Check email uniqueness (constant-time response to prevent timing enumeration)
router.post('/check-email', checkUniquenessLimiter, async (req, res) => {
    const start = Date.now();
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email' });
        }
        const [rows] = await db.promise().query(
            'SELECT COUNT(*) as count FROM users WHERE email = ?',
            [email]
        );
        const elapsed = Date.now() - start;
        const delay = Math.max(0, 200 - elapsed);
        setTimeout(() => res.json({ isUnique: Number(rows[0].count) === 0 }), delay);
    } catch (error) {
        console.error('Email check error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Check phone uniqueness (constant-time response to prevent timing enumeration)
router.post('/check-phone', checkUniquenessLimiter, async (req, res) => {
    const start = Date.now();
    try {
        const { phone } = req.body;
        if (!phone || typeof phone !== 'string') {
            return res.status(400).json({ error: 'Invalid phone' });
        }
        const [rows] = await db.promise().query(
            'SELECT COUNT(*) as count FROM users WHERE phone = ?',
            [phone]
        );
        const elapsed = Date.now() - start;
        const delay = Math.max(0, 200 - elapsed);
        setTimeout(() => res.json({ isUnique: Number(rows[0].count) === 0 }), delay);
    } catch (error) {
        console.error('Phone check error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Rate limiter for registration (prevents mass account creation and resource abuse)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration route with file uploads
router.post(
  "/register",
  registerLimiter,
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
          const ALLOWED_PROFILE_HOSTS = new Set([
            'lh3.googleusercontent.com',
            'lh4.googleusercontent.com',
            'lh5.googleusercontent.com',
            'lh6.googleusercontent.com',
            'platform-lookaside.fbsbx.com',
            'avatars.githubusercontent.com',
            'graph.facebook.com',
          ]);
          const picUrl = new URL(socialUser.profile_picture);
          if (picUrl.protocol !== 'https:' || !ALLOWED_PROFILE_HOSTS.has(picUrl.hostname)) {
            console.warn('Blocked untrusted profile picture URL:', picUrl.hostname);
          } else {
            const response = await fetch(picUrl.toString());
            const buffer = Buffer.from(await response.arrayBuffer());
            const fileName = `social_${Date.now()}.jpg`;
            if (useR2) {
              profilePhotoPath = await uploadToR2(buffer, `profile_photos/${fileName}`, 'image/jpeg');
            } else {
              await fs.promises.writeFile(path.join(__dirname, 'uploads', 'profile_photos', fileName), buffer);
              profilePhotoPath = `profile_photos/${fileName}`;
            }
          }
        } catch (error) {
          console.error('Error saving social profile photo:', error);
        }
      }

      debug(10, "Files OK. Hashing password...");
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

      // Generate verification token (for all registrations - including social)
      const verificationToken = generateVerificationToken();
      const hashedVerificationToken = hashToken(verificationToken);
      const tokenExpires = new Date();
      tokenExpires.setHours(tokenExpires.getHours() + 24);

      debug(11, "Inserting user into DB...");
      // Insert user data with verification fields (PostgreSQL: RETURNING id for insertId)
      // Store hashed token in DB; raw token is sent to user via email
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
          hashedVerificationToken,
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
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("r2") || msg.includes("not configured")) {
        return res.status(500).json({ error: "File upload service not configured. Contact support." });
      }
      if (msg.includes("column") || msg.includes("syntax") || error.code) {
        console.error("[REGISTER] Database error:", error);
        return res.status(500).json({ error: "An internal error occurred. Please try again." });
      }
      res.status(500).json({ error: "An internal error occurred during registration." });
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

  if (_isDev) {
    console.log("=== Email Verification (GET) ===");
    console.log("Token length:", token.length);
  }

  if (!token) {
    return res.redirect(`${redirectBase}/verify-result?status=error&message=invalid`);
  }

  try {
    // Hash the incoming token and compare against stored hash
    const hashedIncomingToken = hashToken(token);
    let [users] = await db
      .promise()
      .query("SELECT id, verification_token_expires FROM users WHERE verification_token = ?", [hashedIncomingToken]);

    if (users.length === 0) {
      [users] = await db
        .promise()
        .query("SELECT id, verification_token_expires FROM users WHERE TRIM(verification_token) = ?", [hashedIncomingToken]);
    }

    if (users.length === 0) {
      if (_isDev) console.log("No user found for verification token hash");
      return res.redirect(`${redirectBase}/verify-result?status=error&message=expired`);
    }

    const user = users[0];
    const now = new Date();
    const expires = user.verification_token_expires ? new Date(user.verification_token_expires) : null;
    if (expires && now > expires) {
      return res.redirect(`${redirectBase}/verify-result?status=error&message=expired`);
    }

    await db
      .promise()
      .query(
        "UPDATE users SET email_verified = true, verification_token = '', verification_token_expires = NULL WHERE id = ?",
        [user.id]
      );

    if (_isDev) console.log("User verified successfully:", user.id);
    return res.redirect(`${redirectBase}/verify-result?status=success`);
  } catch (error) {
    console.error("Verification error:", error);
    return res.redirect(`${redirectBase}/verify-result?status=error&message=server`);
  }
});

// POST - Fallback for programmatic verification
router.post(["/verify-email", "/verify-email/:token"], async (req, res) => {
  let token = (req.body?.token || req.params?.token || "").trim();
  try {
    token = decodeURIComponent(token);
  } catch (_) {}
  if (_isDev) console.log("Email Verification POST - token length:", token.length);

  if (!token) {
    return res.status(400).json({ message: "Verification link is invalid or has expired." });
  }

  try {
    // Hash the incoming token and compare against stored hash
    const hashedIncomingToken = hashToken(token);
    const [users] = await db
      .promise()
      .query(
        "SELECT id, verification_token_expires FROM users WHERE verification_token = ?",
        [hashedIncomingToken]
      );

    if (users.length === 0) {
      if (_isDev) console.log("No user found with this token");
      return res.status(400).json({ message: "Verification link is invalid or has expired." });
    }

    const user = users[0];
    const now = new Date();
    const expires = user.verification_token_expires ? new Date(user.verification_token_expires) : null;
    if (expires && now > expires) {
      return res.status(400).json({ message: "Verification link has expired." });
    }

    await db
      .promise()
      .query(
        "UPDATE users SET email_verified = true, verification_token = '', verification_token_expires = NULL WHERE id = ?",
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
    if (_isDev) console.log("Google callback - user id:", req.user?.id, "isTemp:", req.user?.isTemp);
    
    const feUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!req.user.isTemp) {
      if (!req.user.email_verified) {
        req.session.destroy(() => {});
        return res.redirect(`${feUrl}/login?error=verify_email`);
      }
      if (_isDev) console.log("Redirecting existing user to dashboard, role:", req.user.role);
      
      req.session.user = {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role || 'user',
        name: req.user.name,
        verificationStatus: req.user.verification_status
      };

      if (req.user.role === 'admin') {
        return res.redirect(`${feUrl}/admin`);
      } else {
        return res.redirect(`${feUrl}/member/dashboard`);
      }
    } else {
      if (_isDev) console.log("Redirecting new user to social registration");
      req.session.socialData = req.user.socialData;
      return res.redirect(`${feUrl}/register/social`);
    }
  }
);

// Updated file upload routes with error handling
router.post("/upload-id-card", isAuthenticated, upload.single("idCard"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let filePath;
    if (useR2 && req.file.buffer) {
      const ext = path.extname(req.file.originalname) || '.pdf';
      const key = `id_cards/id-card-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      filePath = await uploadToR2(req.file.buffer, key, req.file.mimetype);
    } else {
      filePath = req.file.path.replace(/^.*[\\\/]uploads[\\\/]/, '');
    }

    const userId = getCurrentUserId(req);
    await db.promise().query("UPDATE users SET id_card_path = ? WHERE id = ?", [filePath, userId]);

    res.json({ message: "ID Card uploaded successfully", filePath });
  } catch (error) {
    console.error("ID Card upload error:", error);
    if (req.file?.path) fs.unlink(req.file.path, (err) => { if (err) console.error("Error deleting file:", err); });
    res.status(500).json({ error: "Error uploading ID Card" });
  }
});

router.post("/upload-profile-photo", isAuthenticated, upload.single("profilePhoto"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let filePath;
    if (useR2 && req.file.buffer) {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const key = `profile_photos/profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      filePath = await uploadToR2(req.file.buffer, key, req.file.mimetype);
    } else {
      filePath = req.file.path.replace(/^.*[\\\/]uploads[\\\/]/, '');
    }

    const userId = getCurrentUserId(req);
    await db.promise().query("UPDATE users SET profile_photo_path = ? WHERE id = ?", [filePath, userId]);

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
    if (_isDev) {
      console.log("Check Auth - Is Authenticated:", req.isAuthenticated());
      console.log("Check Auth - User ID:", req.session?.user?.id || req.user?.id || "none");
    }
    
    let user = null;
    let isAuthenticated = false;
    
    // First check session.user (our custom session)
    if (req.session && req.session.user) {
      if (_isDev) console.log("Using session.user with role:", req.session.user.role);
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
      if (_isDev) console.log("Using passport user with role:", req.user.role);
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
      
      if (_isDev) console.log("Returning authenticated user with role:", user.role);
      return res.json({
        isAuthenticated: true,
        user: user
      });
    } else {
      if (_isDev) console.log("No authenticated user found");
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
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [user] = await db
      .promise()
      .query("SELECT email_verified FROM users WHERE id = ?", [currentUser.id]);

    res.json({
      isVerified: !!user[0]?.email_verified,
      email: currentUser.email,
    });
  } catch (error) {
    console.error("Verification check error:", error);
    res.status(500).json({ error: "Error checking verification status" });
  }
});

router.post("/resend-verification", async (req, res) => {
  try {
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const verificationToken = generateVerificationToken();
    const hashedVerificationToken = hashToken(verificationToken);
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24);

    await db.promise().query(
      `UPDATE users 
             SET verification_token = ?, 
                 verification_token_expires = ? 
             WHERE id = ?`,
      [hashedVerificationToken, tokenExpires, currentUser.id]
    );

    await sendVerificationEmail(currentUser.email, verificationToken);

    res.json({ message: "Verification email resent successfully" });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Error resending verification email" });
  }
});

// Enhanced logout route with cache clearing (POST to prevent Logout CSRF via img/link tags)
router.post("/clear-session", (req, res) => {
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

// Clear all session data (requires authentication, POST only)
router.post("/clear-all-session", (req, res) => {
  if (!req.session?.user && !req.isAuthenticated?.()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.logout(function(err) {
    if (err) {
      console.error("Logout error:", err);
    }
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({ error: "Failed to clear session" });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: "Session and cookies cleared" });
    });
  });
});

// Rate limiters for password reset (brute force protection)
const resetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many reset requests. Try again later." },
});
const resetSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts. Try again later." },
});

// Password Reset Routes
router.post('/reset-password-request', resetRequestLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    const [users] = await db.promise().query(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }
    
    const user = users[0];
    
    // Generate reset token - store hash in DB, send raw token to user
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = hashToken(resetToken);
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now
    
    await db.promise().query(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [hashedResetToken, resetTokenExpires, user.id]
    );
    
    // Token in hash fragment only - not sent in Referer or server logs (security)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password#token=${encodeURIComponent(resetToken)}`;
    
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
    
    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Error sending reset email:', error);
    res.status(500).json({ error: 'Failed to send reset email. Please try again later.' });
  }
});

// Validate reset token (GET with token in URL - kept for backward compatibility with old email links)
router.get('/reset-password/:token', resetSubmitLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const valid = await validateResetToken(token);
    if (!valid) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }
    res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// Validate reset token via POST body (for new links that use hash fragment - token never in URL)
router.post('/validate-reset-token', resetSubmitLimiter, async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }
    const valid = await validateResetToken(token);
    if (!valid) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }
    res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Error validating reset token:', error);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

async function validateResetToken(token) {
  const hashedIncoming = hashToken(token);
  const [users] = await db.promise().query(
    'SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()',
    [hashedIncoming]
  );
  return users.length > 0;
}

router.post('/reset-password', resetSubmitLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate password strength
    const { valid, error: pwError } = validatePasswordStrength(password);
    if (!valid) {
      return res.status(400).json({ error: pwError });
    }
    
    // Hash the incoming token and compare against stored hash
    const hashedIncoming = hashToken(token);
    const [users] = await db.promise().query(
      'SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()',
      [hashedIncoming]
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

    // Invalidate all active sessions for this user (prevents session hijacking after password reset)
    await db.pool.query(
      "DELETE FROM user_sessions WHERE sess::jsonb -> 'user' ->> 'id' = $1",
      [String(user.id)]
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

  res.status(500).json({ error: "Internal server error" });
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
