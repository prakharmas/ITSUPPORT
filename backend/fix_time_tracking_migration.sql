-- Fix Time Tracking Migration
-- Properly add missing columns and create tables

-- Add estimated_hours to work_items (without IF NOT EXISTS which isn't supported in all MySQL versions)
ALTER TABLE work_items ADD COLUMN estimated_hours DECIMAL(5, 2) NULL COMMENT 'Estimated time in hours';

-- Create indexes
CREATE INDEX idx_time_entries_logged_at ON time_entries(logged_at);
CREATE INDEX idx_time_entries_user_logged ON time_entries(user_id, logged_at);









