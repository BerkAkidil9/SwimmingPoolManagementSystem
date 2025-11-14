-- Add 'invalid' to the status enum in health_reports table
ALTER TABLE health_reports 
MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'invalid') DEFAULT 'pending';

-- Add rejected_reason column to health_reports table
ALTER TABLE health_reports
ADD COLUMN rejected_reason TEXT AFTER doctor_notes;
