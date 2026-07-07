-- Create activity_reports table
CREATE TABLE IF NOT EXISTS activity_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    work_item_id INT,
    branch_id INT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    hours_worked INT NOT NULL COMMENT 'Duration in minutes',
    feature_worked VARCHAR(255),
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    accomplishments TEXT,
    blockers TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, date),
    INDEX idx_date (date)
);




