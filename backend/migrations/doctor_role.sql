-- Add doctor role to users table
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'doctor') DEFAULT 'user';

-- Add health status column to users table
ALTER TABLE users ADD COLUMN health_status ENUM('pending', 'approved', 'needs_report') DEFAULT 'pending' AFTER verification_status;

-- Add health status reason column to users table
ALTER TABLE users ADD COLUMN health_status_reason TEXT AFTER health_status;

-- Create health reports table for storing additional health documents
CREATE TABLE health_reports (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    report_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    doctor_notes TEXT,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
