-- Add staff role to users table
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'doctor', 'staff') DEFAULT 'user';
