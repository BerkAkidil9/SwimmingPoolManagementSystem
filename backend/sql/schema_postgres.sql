-- Swimming Pool Management System - PostgreSQL Schema
-- Usage: psql $DATABASE_URL -f schema_postgres.sql
-- Or: npm run db:init

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS qr_code_verifications;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS health_info;
DROP TABLE IF EXISTS health_reports;
DROP TABLE IF EXISTS packages;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS "Pools" CASCADE;

-- Drop existing types (for re-running schema)
DROP TYPE IF EXISTS reservation_status_enum CASCADE;
DROP TYPE IF EXISTS payment_status_enum CASCADE;
DROP TYPE IF EXISTS package_type_enum CASCADE;
DROP TYPE IF EXISTS report_status_enum CASCADE;
DROP TYPE IF EXISTS feedback_status_enum CASCADE;
DROP TYPE IF EXISTS blood_type_enum CASCADE;
DROP TYPE IF EXISTS health_status_enum CASCADE;
DROP TYPE IF EXISTS verification_status_enum CASCADE;
DROP TYPE IF EXISTS role_enum CASCADE;
DROP TYPE IF EXISTS swimming_ability_enum CASCADE;
DROP TYPE IF EXISTS gender_enum CASCADE;

-- Custom types (PostgreSQL enums)
CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE swimming_ability_enum AS ENUM ('Yes', 'No');
CREATE TYPE role_enum AS ENUM ('user', 'admin', 'doctor', 'staff', 'coach');
CREATE TYPE verification_status_enum AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE health_status_enum AS ENUM ('pending', 'approved', 'needs_report', 'rejected');
CREATE TYPE blood_type_enum AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
CREATE TYPE feedback_status_enum AS ENUM ('new', 'read', 'archived');
CREATE TYPE report_status_enum AS ENUM ('pending', 'approved', 'rejected', 'invalid');
CREATE TYPE package_type_enum AS ENUM ('education', 'free_swimming');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE reservation_status_enum AS ENUM ('active', 'canceled', 'completed', 'missed');

-- Pools
CREATE TABLE "Pools" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL,
  rules TEXT,
  location VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) DEFAULT NULL,
  provider_id VARCHAR(255) DEFAULT NULL,
  profile_picture VARCHAR(255) DEFAULT NULL,
  name VARCHAR(50) DEFAULT NULL,
  surname VARCHAR(50) DEFAULT NULL,
  date_of_birth DATE DEFAULT NULL,
  gender gender_enum DEFAULT NULL,
  swimming_ability swimming_ability_enum DEFAULT NULL,
  phone VARCHAR(15) DEFAULT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  terms_accepted BOOLEAN DEFAULT FALSE,
  id_card_path VARCHAR(255) DEFAULT NULL,
  profile_photo_path VARCHAR(255) DEFAULT NULL,
  privacy_accepted BOOLEAN DEFAULT FALSE,
  marketing_accepted BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255) DEFAULT NULL,
  verification_token_expires TIMESTAMP DEFAULT NULL,
  role role_enum DEFAULT 'user',
  verification_status verification_status_enum DEFAULT 'pending',
  health_status health_status_enum DEFAULT 'pending',
  health_status_reason TEXT,
  verification_reason TEXT,
  rejection_count INTEGER DEFAULT 0,
  password_reset_token VARCHAR(255) DEFAULT NULL,
  password_reset_expires TIMESTAMP DEFAULT NULL,
  stripe_customer_id VARCHAR(255) DEFAULT NULL,
  health_report_requested_at TIMESTAMP DEFAULT NULL,
  health_report_reminder_sent_at TIMESTAMP DEFAULT NULL,
  health_report_request_count INTEGER DEFAULT 0,
  UNIQUE (provider, provider_id),
  UNIQUE (phone)
);

CREATE INDEX idx_users_health_report ON users(health_status, health_report_requested_at);

-- Feedback
CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status feedback_status_enum DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health info
CREATE TABLE health_info (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blood_type blood_type_enum NOT NULL,
  allergies VARCHAR(255) DEFAULT NULL,
  chronic_conditions VARCHAR(255) DEFAULT NULL,
  medications VARCHAR(255) DEFAULT NULL,
  height DECIMAL(5,2) DEFAULT NULL,
  weight DECIMAL(5,2) DEFAULT NULL,
  emergency_contact_name VARCHAR(100) NOT NULL,
  emergency_contact_phone VARCHAR(15) NOT NULL,
  has_heart_problems BOOLEAN NOT NULL DEFAULT FALSE,
  chest_pain_activity BOOLEAN NOT NULL DEFAULT FALSE,
  balance_dizziness BOOLEAN NOT NULL DEFAULT FALSE,
  other_chronic_disease BOOLEAN NOT NULL DEFAULT FALSE,
  prescribed_medication BOOLEAN NOT NULL DEFAULT FALSE,
  bone_joint_issues BOOLEAN NOT NULL DEFAULT FALSE,
  doctor_supervised_activity BOOLEAN NOT NULL DEFAULT FALSE,
  emergency_contact_relationship VARCHAR(50) DEFAULT NULL,
  emergency_contact_relationship_other VARCHAR(100) DEFAULT NULL,
  health_additional_info TEXT
);

-- Health reports
CREATE TABLE health_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status report_status_enum DEFAULT 'pending',
  doctor_notes TEXT,
  rejected_reason TEXT
);

-- Packages
CREATE TABLE packages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type package_type_enum NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  remaining_sessions INTEGER NOT NULL,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods
CREATE TABLE payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_method_id VARCHAR(255) NOT NULL,
  card_brand VARCHAR(50) NOT NULL,
  last4 VARCHAR(4) NOT NULL,
  exp_month INTEGER NOT NULL,
  exp_year INTEGER NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_type package_type_enum NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_intent_id VARCHAR(255) NOT NULL,
  status payment_status_enum NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  pool_id INTEGER NOT NULL REFERENCES "Pools"(id) ON DELETE CASCADE,
  type package_type_enum NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  initial_capacity INTEGER DEFAULT NULL,
  session_date DATE NOT NULL
);

-- Reservations
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status reservation_status_enum DEFAULT 'active'
);

-- QR code verifications
CREATE TABLE qr_code_verifications (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  check_in_code VARCHAR(100) NOT NULL UNIQUE,
  verified_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
