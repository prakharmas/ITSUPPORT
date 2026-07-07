-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM(
        'ticket_assigned',
        'ticket_updated',
        'ticket_commented',
        'ticket_reopened',
        'ticket_status_changed',
        'ticket_reassigned',
        'mention',
        'due_date_reminder',
        'sla_alert'
    ) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    ticket_id INT,
    related_user_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ticket_id) REFERENCES work_items(id) ON DELETE CASCADE,
    FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_created (created_at)
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    
    -- Email preferences
    email_ticket_assigned BOOLEAN DEFAULT TRUE,
    email_ticket_updated BOOLEAN DEFAULT TRUE,
    email_ticket_commented BOOLEAN DEFAULT TRUE,
    email_ticket_reopened BOOLEAN DEFAULT TRUE,
    email_due_date_reminder BOOLEAN DEFAULT TRUE,
    email_sla_alert BOOLEAN DEFAULT TRUE,
    
    -- In-app preferences
    app_ticket_assigned BOOLEAN DEFAULT TRUE,
    app_ticket_updated BOOLEAN DEFAULT TRUE,
    app_ticket_commented BOOLEAN DEFAULT TRUE,
    app_ticket_reopened BOOLEAN DEFAULT TRUE,
    app_due_date_reminder BOOLEAN DEFAULT TRUE,
    app_sla_alert BOOLEAN DEFAULT TRUE,
    
    -- General settings
    digest_frequency ENUM('none', 'daily', 'weekly') DEFAULT 'none',
    quiet_hours_start INT,
    quiet_hours_end INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);










