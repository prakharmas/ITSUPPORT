-- Add new date columns to work_items table
ALTER TABLE work_items 
ADD COLUMN start_date TIMESTAMP NULL AFTER assignee_id,
ADD COLUMN end_date TIMESTAMP NULL AFTER start_date,
ADD COLUMN completed_at TIMESTAMP NULL AFTER due_at;

-- Add indexes for better query performance
CREATE INDEX idx_start_date ON work_items(start_date);
CREATE INDEX idx_end_date ON work_items(end_date);
CREATE INDEX idx_completed_at ON work_items(completed_at);










