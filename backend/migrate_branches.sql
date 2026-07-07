-- Branch-based requester migration script
-- Run this script to add branch support to your existing database

-- 1) Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

-- 2) Extend users table with requester role and branch_id
ALTER TABLE users
  MODIFY role ENUM('pm','dev','requester') NOT NULL DEFAULT 'requester',
  ADD COLUMN branch_id INT NULL,
  ADD CONSTRAINT fk_users_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id);

-- 3) Extend work_items table with branch_id
ALTER TABLE work_items
  ADD COLUMN branch_id INT NULL,
  ADD CONSTRAINT fk_work_items_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id);

-- 4) Create indexes for better performance (MySQL doesn't support IF NOT EXISTS for indexes)
-- These will be created by the Python script with proper error handling

-- 5) Insert default branches
INSERT IGNORE INTO branches (id, name) VALUES
(1, 'HQ'),
(2, 'East'),
(3, 'West'),
(4, 'North'),
(5, 'South');

-- 6) Assign existing users to HQ branch (you can change this)
UPDATE users SET branch_id = 1 WHERE branch_id IS NULL;

-- 7) Backfill existing work items to the reporter's branch
UPDATE work_items wi
JOIN users u ON u.id = wi.reporter_id
SET wi.branch_id = u.branch_id
WHERE wi.branch_id IS NULL;

-- 8) Create some sample users for testing
INSERT IGNORE INTO users (name, email, password_hash, role, branch_id) VALUES
('East Branch Manager', 'east@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeBw7F3gGJzQjY7W6', 'requester', 2),
('West Branch Manager', 'west@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeBw7F3gGJzQjY7W6', 'requester', 3),
('East Developer', 'eastdev@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeBw7F3gGJzQjY7W6', 'dev', 2),
('West Developer', 'westdev@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeBw7F3gGJzQjY7W6', 'dev', 3);

-- 9) Create some sample work items from different branches
INSERT IGNORE INTO work_items (title, description, type, status, priority, reporter_id, assignee_id, branch_id, due_at, sla_hours) VALUES
('East Branch Network Issue', 'Internet connectivity problems in East branch', 'support', 'backlog', 'high', 
 (SELECT id FROM users WHERE email = 'east@example.com'), 
 (SELECT id FROM users WHERE email = 'eastdev@example.com'), 2, 
 DATE_ADD(NOW(), INTERVAL 1 DAY), 24),
('West Branch Printer Setup', 'Need to configure new printer in West branch', 'support', 'in_progress', 'normal',
 (SELECT id FROM users WHERE email = 'west@example.com'),
 (SELECT id FROM users WHERE email = 'westdev@example.com'), 3,
 DATE_ADD(NOW(), INTERVAL 2 DAY), 48),
('HQ Feature Request', 'Add dark mode to the application', 'feature', 'review', 'normal',
 (SELECT id FROM users WHERE email = 'pm@example.com'),
 (SELECT id FROM users WHERE email = 'dev@example.com'), 1,
 DATE_ADD(NOW(), INTERVAL 7 DAY), NULL);

-- Migration complete!
-- You can now test the branch-based functionality
