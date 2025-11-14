-- Add timestamp columns to track health report requests and reminders
ALTER TABLE `users` 
ADD COLUMN `health_report_requested_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'When a health report was requested from the user',
ADD COLUMN `health_report_reminder_sent_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'When a reminder for health report was sent';

-- Add index to improve query performance for reminder job
CREATE INDEX idx_health_report_requests ON users(health_status, health_report_requested_at);
