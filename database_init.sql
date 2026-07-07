-- IT Support Tool Database Schema
-- Run this script to initialize your MySQL database

-- Create database (uncomment if needed)
-- CREATE DATABASE IF NOT EXISTS itsupport;
-- USE itsupport;

-- Users & roles
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('pm','dev') NOT NULL DEFAULT 'dev',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects (optional if you have multiple)
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL
);

-- Work items (support tickets + features)
CREATE TABLE IF NOT EXISTS work_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type ENUM('support','feature') NOT NULL,
  status ENUM('backlog','in_progress','review','done') NOT NULL DEFAULT 'backlog',
  priority ENUM('critical','high','normal','low') DEFAULT 'normal',
  reporter_id INT NOT NULL,
  assignee_id INT NULL,
  due_at DATETIME NULL,
  sla_hours INT NULL,       -- set for support items if needed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  FOREIGN KEY (assignee_id) REFERENCES users(id)
);

-- Comments / activity
CREATE TABLE IF NOT EXISTS item_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  user_id INT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES work_items(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- On-call rotation
CREATE TABLE IF NOT EXISTS oncall_roster (
  id INT AUTO_INCREMENT PRIMARY KEY,
  starts_on DATE NOT NULL,   -- Monday of the week
  user_id INT NOT NULL,
  UNIQUE KEY uniq_week (starts_on),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert default project
INSERT IGNORE INTO projects (id, name) VALUES (1, 'Default Project');

-- Insert sample users (passwords are 'password123' hashed with bcrypt)
-- PM user: pm@example.com / password123
-- Dev user: dev@example.com / password123
INSERT IGNORE INTO users (id, name, email, password_hash, role) VALUES 
(1, 'Product Manager', 'pm@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeBw7F3gGJzQjY7W6', 'pm'),
(2, 'Developer', 'dev@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeBw7F3gGJzQjY7W6', 'dev');

-- Insert sample work items
INSERT IGNORE INTO work_items (id, title, description, type, status, priority, reporter_id, assignee_id, due_at, sla_hours) VALUES
(1, 'Fix login issue', 'Users cannot log in with Google OAuth', 'support', 'backlog', 'high', 1, 2, DATE_ADD(NOW(), INTERVAL 2 DAY), 24),
(2, 'Add dark mode', 'Implement dark mode toggle in settings', 'feature', 'in_progress', 'normal', 1, 2, DATE_ADD(NOW(), INTERVAL 7 DAY), NULL),
(3, 'Database performance', 'Optimize slow queries in reports', 'support', 'review', 'critical', 2, 1, DATE_ADD(NOW(), INTERVAL 1 DAY), 12),
(4, 'Mobile responsive', 'Make dashboard mobile-friendly', 'feature', 'done', 'normal', 1, 2, DATE_ADD(NOW(), INTERVAL -1 DAY), NULL);

-- Insert sample comments
INSERT IGNORE INTO item_comments (id, item_id, user_id, body) VALUES
(1, 1, 2, 'Investigating the OAuth configuration'),
(2, 2, 2, 'Working on the dark mode CSS variables'),
(3, 3, 1, 'Database indexes have been added');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
CREATE INDEX IF NOT EXISTS idx_work_items_type ON work_items(type);
CREATE INDEX IF NOT EXISTS idx_work_items_assignee ON work_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_items_due_at ON work_items(due_at);
CREATE INDEX IF NOT EXISTS idx_item_comments_item_id ON item_comments(item_id);
CREATE INDEX IF NOT EXISTS idx_oncall_roster_starts_on ON oncall_roster(starts_on);
