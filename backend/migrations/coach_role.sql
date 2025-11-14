-- Add coach role to users table
ALTER TABLE users 
MODIFY COLUMN role ENUM('user', 'admin', 'doctor', 'staff', 'coach') 
DEFAULT 'user';
