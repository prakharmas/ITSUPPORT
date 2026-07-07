-- Time Tracking System Migration
-- Add time tracking capabilities to the IT Support System

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_item_id INT NOT NULL,
    user_id INT NOT NULL,
    
    -- Time tracking
    hours DECIMAL(5, 2) NOT NULL,  -- Decimal hours (e.g., 2.5 for 2h 30m)
    description TEXT,
    
    -- Timer fields
    started_at DATETIME NULL,
    stopped_at DATETIME NULL,
    is_running TINYINT(1) DEFAULT 0,
    
    -- Categorization
    is_billable TINYINT(1) DEFAULT 1,
    activity_type VARCHAR(50),
    
    -- Timestamps
    logged_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_work_item (work_item_id),
    INDEX idx_user (user_id),
    INDEX idx_logged_at (logged_at)
);

-- Add estimated_hours to work_items table
ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5, 2) NULL COMMENT 'Estimated time in hours';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_time_entries_logged_at ON time_entries(logged_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_logged ON time_entries(user_id, logged_at);









