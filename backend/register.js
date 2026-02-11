const { validateRegistration } = require("./validations");
const express = require("express");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Add after imports and before routes
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const sendVerificationEmail = async (email, token) => {
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Email Address",
    html: `
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationLink}">${verificationLink}</a>
        <p>This link will expire in 24 hours.</p>
      `,
  };

  await transporter.sendMail(mailOptions);
};

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const db = require("./config/database");
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadDir = "uploads/";

    // Determine the appropriate subdirectory based on file type
    if (file.fieldname === "idCard") {
      uploadDir += "id_cards";
    } else if (file.fieldname === "profilePhoto") {
      uploadDir += "profile_photos";
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    console.log(`Saving ${file.fieldname} to:`, uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename =
      file.fieldname === "idCard"
        ? `id-card-${uniqueSuffix}${path.extname(file.originalname)}`
        : `profile-${uniqueSuffix}${path.extname(file.originalname)}`;
    console.log("Generated filename:", filename);
    cb(null, filename);
  },
});

// Configure multer with file type validation
const upload = multer({
  storage: storage,
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
      callbackURL: "http://localhost:3001/auth/google/callback",
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

// GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:3001/auth/github/callback",
    scope: ['user:email'],
    allowSignup: true
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      console.log("GitHub OAuth Profile:", profile);
      
      // Get primary email from GitHub
      let email = profile.emails?.[0]?.value;

      // Check if user exists
      const [existingUsers] = await db.promise().query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        // Return existing user with isTemp: false
        return done(null, {
          ...existingUsers[0],
          isTemp: false
        });
      }

      // For new users, create temporary user object
      const tempUser = {
        isTemp: true,
        provider: 'github',
        provider_id: profile.id,
        name: profile.displayName || profile.username,
        email: email,
        profile_picture: profile.photos[0]?.value,
        socialData: {
          given_name: profile.displayName?.split(' ')[0] || profile.username,
          family_name: profile.displayName?.split(' ').slice(1).join(' ') || '',
          picture: profile.photos[0]?.value,
          email: email,
          provider: 'GitHub'
        }
      };

      return done(null, tempUser);
    } catch (error) {
      console.error('GitHub auth error:', error);
      done(error, null);
    }
  }
));

// Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:3001/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name', 'picture.type(large)']
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      console.log("Facebook OAuth Profile:", profile);

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
        provider: "facebook",
        provider_id: profile.id,
        name: profile.name.givenName,
        surname: profile.name.familyName,
        email: profile.emails[0].value,
        profile_picture: profile.photos[0]?.value || null,
        needsRegistration: true,
        // Store additional data from Facebook profile
        socialData: {
          given_name: profile.name.givenName,
          family_name: profile.name.familyName,
          picture: profile.photos[0]?.value,
          email: profile.emails[0].value,
          provider: "Facebook"
        }
      };

      return done(null, tempUser);
    } catch (error) {
      console.error("Facebook auth error:", error);
      done(error, null);
    }
  }
));

// Add these routes before the main registration route

// Check email uniqueness
router.post('/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        const [rows] = await db.promise().query(
            'SELECT COUNT(*) as count FROM users WHERE email = ?',
            [email]
        );
        res.json({ isUnique: rows[0].count === 0 });
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
        res.json({ isUnique: rows[0].count === 0 });
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
    try {
      console.log("Starting registration process...");
      console.log("Request body:", req.body);
      console.log("Files received:", req.files);

      const socialUser = req.user?.isTemp ? req.user : null;
      console.log("Social User Data:", socialUser);

      // Validate the request data
      const { isValid, errors } = validateRegistration(
        req.body,
        req.files,
        socialUser
      );

      if (!isValid) {
        // Clean up uploaded files if validation fails
        if (req.files) {
          Object.values(req.files).forEach((fileArray) => {
            fileArray.forEach((file) => {
              fs.unlink(file.path, (err) => {
                if (err) console.error("Error deleting file:", err);
              });
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
      const idCardPath = req.files?.idCard 
        ? `id_cards/${path.basename(req.files.idCard[0].path)}`
        : null;

      // Handle profile photo path
      let profilePhotoPath = null;
      if (req.files?.profilePhoto?.[0]) {
        // If user uploaded a new photo
        profilePhotoPath = `profile_photos/${path.basename(req.files.profilePhoto[0].path)}`;
      } else if (socialUser?.profile_picture) {
        // If using social photo, download and save it
        try {
          const response = await fetch(socialUser.profile_picture);
          const buffer = await response.buffer();
          const fileName = `social_${Date.now()}.jpg`;
          
          // Save to profile_photos directory
          await fs.promises.writeFile(
            path.join(__dirname, 'uploads', 'profile_photos', fileName),
            buffer
          );
          
          // Store the relative path
          profilePhotoPath = `profile_photos/${fileName}`;
        } catch (error) {
          console.error('Error saving social profile photo:', error);
        }
      }

      console.log("Profile photo path:", profilePhotoPath);

      // Hash password only if it's provided (not social registration)
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

      // Generate verification token
      const verificationToken = generateVerificationToken();
      const tokenExpires = new Date();
      tokenExpires.setHours(tokenExpires.getHours() + 24);

      console.log("Generated token:", verificationToken);
      console.log("Token expires:", tokenExpires);

      // Insert user data with verification fields
      const [userResult] = await db.promise().query(
        `INSERT INTO users (
                provider, provider_id, profile_picture,
                name, surname, date_of_birth, gender, swimming_ability, phone, email, 
                password, terms_accepted, privacy_accepted, marketing_accepted,
                id_card_path, profile_photo_path, verification_token,
                verification_token_expires, email_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          socialUser?.provider || null,
          socialUser?.provider_id || null,
          socialUser?.profile_picture || null,
          socialUser?.name || name || null,
          surname || null,
          date_of_birth || null,
          gender || null,
          swimming_ability || null,
          phone || null,
          socialUser?.email || email,
          hashedPassword,
          terms_accepted === true || terms_accepted === "true" ? 1 : 0,
          privacy_accepted === true || privacy_accepted === "true" ? 1 : 0,
          marketing_accepted === true || marketing_accepted === "true" ? 1 : 0,
          idCardPath,
          profilePhotoPath,
          verificationToken,
          tokenExpires,
          false, // email_verified
        ]
      );

      // Add this after the insert
      const [checkUser] = await db
        .promise()
        .query(
          "SELECT verification_token, verification_token_expires FROM users WHERE id = ?",
          [userResult.insertId]
        );
      console.log("Stored token info:", checkUser[0]);

      console.log("User created with ID:", userResult.insertId);
      const userId = userResult.insertId;

      // Send verification email
      await sendVerificationEmail(
        socialUser?.email || email,
        verificationToken
      );

      // Insert health information
      console.log("Inserting health information...");
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
          blood_type,
          allergies,
          chronic_conditions,
          medications,
          height,
          weight,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relationship,
          emergency_contact_relationship_other,
          has_heart_problems === true || has_heart_problems === "true" ? 1 : 0,
          chest_pain_activity === true || chest_pain_activity === "true"
            ? 1
            : 0,
          balance_dizziness === true || balance_dizziness === "true" ? 1 : 0,
          other_chronic_disease === true || other_chronic_disease === "true"
            ? 1
            : 0,
          prescribed_medication === true || prescribed_medication === "true"
            ? 1
            : 0,
          bone_joint_issues === true || bone_joint_issues === "true" ? 1 : 0,
          doctor_supervised_activity === true ||
          doctor_supervised_activity === "true"
            ? 1
            : 0,
          health_additional_info,
        ]
      );

      console.log("Health information inserted successfully");

      // Response without auto-login since email needs verification
      res.status(201).json({
        message:
          "Registration successful. Please check your email to verify your account.",
        userId: userId,
        requiresVerification: true,
      });
    } catch (error) {
      console.error("Registration error:", error);
      // Clean up uploaded files if registration fails
      if (req.files) {
        Object.values(req.files).forEach((fileArray) => {
          fileArray.forEach((file) => {
            fs.unlink(file.path, (err) => {
              if (err) console.error("Error deleting file:", err);
            });
          });
        });
      }

      if (error.code === "ER_DUP_ENTRY") {
        if (error.sqlMessage.includes("email")) {
          return res.status(400).json({ error: "Email already registered" });
        }
        if (error.sqlMessage.includes("phone")) {
          return res
            .status(400)
            .json({ error: "Phone number already registered" });
        }
      }
      res.status(500).json({ error: "Error during registration" });
    }
  }
);

// Add this route to handle email verification
router.post("/verify-email/:token", async (req, res) => {
  console.log("=== Email Verification Debug ===");
  console.log("Received token:", req.params.token);

  try {
    const token = req.params.token;

    // Find user with this verification token
    const [users] = await db
      .promise()
      .query(
        "SELECT * FROM users WHERE verification_token = ? AND verification_token_expires > NOW()",
        [token]
      );

    // Also check if user is already verified with this token (for repeat attempts)
    if (users.length === 0) {
      // If no user found with active token, check if any user was verified with this token
      const [verifiedUsers] = await db
        .promise()
        .query(
          "SELECT * FROM users WHERE email_verified = 1 AND verification_token = ''",
          []
        );

      // If we found verified users, this was likely a repeat verification attempt
      if (verifiedUsers.length > 0) {
        return res.status(200).json({ 
          message: "Email verification successful. You can now login to your account.",
          alreadyVerified: true 
        });
      }

      console.log("No matching user found for token:", token);
      return res.status(400).json({ message: "Verification link is invalid or has expired." });
    }

    const user = users[0];
    console.log("User verified successfully", user);

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
    
    // If user is not temporary (i.e., it's an existing user), create a proper session
    if (!req.user.isTemp) {
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

// GitHub auth routes
router.get(
  "/github",
  (req, res, next) => {
    // Clear existing session before GitHub auth
    req.session.destroy(() => next());
  },
  passport.authenticate("github", { 
    scope: ["user:email"],
    allowSignup: true 
  })
);

router.get(
  "/github/callback",
  passport.authenticate("github", { 
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: true
  }),
  (req, res) => {
    console.log("GitHub callback - user:", req.user);
    
    if (req.user.isTemp) {
      // New user - store social data and redirect to registration
      req.session.socialData = req.user.socialData;
      req.session.save(err => {
        if (err) console.error("Session save error:", err);
        return res.redirect(`${process.env.FRONTEND_URL}/register/social`);
      });
    } else {
      // Existing user - create session and redirect to dashboard
      req.session.user = {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role || 'user',
        name: req.user.name,
        verificationStatus: req.user.verification_status
      };
      
      req.session.save(err => {
        if (err) console.error("Session save error:", err);
        return res.redirect(`${process.env.FRONTEND_URL}/member/dashboard`);
      });
    }
  }
);

// Facebook auth routes
router.get('/facebook',
  passport.authenticate('facebook', { 
    scope: ['email', 'public_profile'],
    prompt: 'select_account'
  })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: true
  }),
  (req, res) => {
    console.log("Facebook callback - user object:", req.user);
    console.log("Is temporary user?", req.user.isTemp);

    // Check if user exists in database
    db.promise().query(
      'SELECT * FROM users WHERE email = ?',
      [req.user.email]
    ).then(([users]) => {
      if (users.length === 0) {
        // New user - store social data and redirect to registration
        req.session.socialData = {
          given_name: req.user.name?.split(' ')[0],
          family_name: req.user.name?.split(' ')[1] || '',
          picture: req.user.profile_picture,
          email: req.user.email,
          provider: 'Facebook'
        };
        
        req.session.save(err => {
          if (err) console.error("Session save error:", err);
          return res.redirect(`${process.env.FRONTEND_URL}/register/social`);
        });
      } else {
        // Existing user - create session and redirect to dashboard
        req.session.user = {
          id: users[0].id,
          email: users[0].email,
          role: users[0].role || 'user',
          name: users[0].name,
          verificationStatus: users[0].verification_status
        };
        
        req.session.save(err => {
          if (err) console.error("Session save error:", err);
          return res.redirect(`${process.env.FRONTEND_URL}/member/dashboard`);
        });
      }
    }).catch(error => {
      console.error("Facebook callback DB error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=database`);
    });
  }
);

// Updated file upload routes with error handling
router.post("/upload-id-card", upload.single("idCard"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Sadece dosya adını ve alt klasörü saklayalım
    const relativePath = req.file.path.replace('uploads/', '');

    await db
      .promise()
      .query("UPDATE users SET id_card_path = ? WHERE id = ?", [
        relativePath,
        req.user.id,
      ]);

    res.json({
      message: "ID Card uploaded successfully",
      filePath: relativePath,
    });
  } catch (error) {
    console.error("ID Card upload error:", error);
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }
    res.status(500).json({ error: "Error uploading ID Card" });
  }
});

router.post(
  "/upload-profile-photo",
  upload.single("profilePhoto"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!req.user) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Sadece dosya adını ve alt klasörü saklayalım
      const relativePath = req.file.path.replace('uploads/', '');

      await db
        .promise()
        .query("UPDATE users SET profile_photo_path = ? WHERE id = ?", [
          relativePath,
          req.user.id,
        ]);

      res.json({
        message: "Profile photo uploaded successfully",
        filePath: relativePath,
      });
    } catch (error) {
      console.error("Profile photo upload error:", error);
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      }
      res.status(500).json({ error: "Error uploading profile photo" });
    }
  }
);

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
    
    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@yourdomain.com',
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h1>You requested a password reset</h1>
        <p>Click this <a href="${resetUrl}">link</a> to set a new password.</p>
        <p>This link is valid for 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
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

  // Clean up any uploaded files if there's an error
  if (req.files) {
    Object.values(req.files).forEach((fileArray) => {
      fileArray.forEach((file) => {
        fs.unlink(file.path, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
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

// Add this before the GitHub auth route
router.get("/github/logout", (req, res) => {
  // Clear any existing GitHub OAuth sessions
  res.redirect('https://github.com/logout');
});

module.exports = router;
