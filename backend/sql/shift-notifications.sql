-- Create shift_notifications table for shift alert tracking
CREATE TABLE IF NOT EXISTS shift_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  job_id INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  is_read TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_job_id (job_id),
  INDEX idx_created_at (created_at)
);
