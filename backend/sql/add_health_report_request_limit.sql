-- Add column to track number of health report requests
ALTER TABLE `users`
ADD COLUMN `health_report_request_count` INT DEFAULT 0 COMMENT 'Number of times a health report has been requested';
