-- Email Notifications Tables
-- Add to job_portal database

-- Track email notification preferences per user
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  job_alert_emails BOOLEAN DEFAULT TRUE,
  application_update_emails BOOLEAN DEFAULT TRUE,
  support_reply_emails BOOLEAN DEFAULT TRUE,
  saved_job_update_emails BOOLEAN DEFAULT TRUE,
  promotional_emails BOOLEAN DEFAULT FALSE,
  email_frequency ENUM('immediate', 'daily', 'weekly') DEFAULT 'immediate',
  unsubscribed_from_all BOOLEAN DEFAULT FALSE,
  unsubscribe_token VARCHAR(64) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Track sent emails for audit trail and retry logic
CREATE TABLE IF NOT EXISTS email_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  email_type ENUM(
    'job_alert_match',
    'application_status_update',
    'application_received',
    'application_reviewed',
    'application_accepted',
    'application_rejected',
    'support_reply',
    'saved_job_updated',
    'saved_job_reposted',
    'saved_job_price_change',
    'job_expiring_soon',
    'referral_notification',
    'interview_invitation',
    'password_reset',
    'email_verification'
  ) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  template_data JSON,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('sent', 'failed', 'bounced', 'complained') DEFAULT 'sent',
  retry_count INT DEFAULT 0,
  error_message TEXT,
  recipient_id INT,
  recipient_type ENUM('user', 'employer') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_email_type (email_type),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status)
);

-- Keep existing installations compatible with new notification type names.
ALTER TABLE email_notifications
  MODIFY COLUMN email_type ENUM(
    'job_alert_match',
    'application_status_update',
    'application_received',
    'application_reviewed',
    'application_accepted',
    'application_rejected',
    'support_reply',
    'saved_job_updated',
    'saved_job_reposted',
    'saved_job_price_change',
    'job_expiring_soon',
    'referral_notification',
    'interview_invitation',
    'password_reset',
    'email_verification'
  ) NOT NULL;

-- Job match events (for batching daily/weekly digests)
CREATE TABLE IF NOT EXISTS job_match_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  job_id INT NOT NULL,
  job_alert_id INT,
  match_score INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_processed_at (processed_at)
);

-- Email templates (configurable by admin)
CREATE TABLE IF NOT EXISTS email_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  subject_template VARCHAR(255) NOT NULL,
  html_body LONGTEXT NOT NULL,
  text_body LONGTEXT,
  variables JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default email templates
INSERT INTO email_templates (name, subject_template, html_body) VALUES
('job_alert_match', 'New Job Alert: {{jobTitle}} in {{location}}', '<h2>{{jobTitle}}</h2><p>A new job matching your alerts has been posted!</p><p><a href="{{jobUrl}}">View Job</a></p>'),
('application_status_update', 'Your Application Status Updated: {{jobTitle}}', '<p>Your application status has been updated to: <strong>{{status}}</strong></p><p><a href="{{applicationUrl}}">View Details</a></p>'),
('support_reply', 'New Reply to Your Support Ticket', '<p>{{replierName}} replied to your support ticket (#{{ticketId}})</p><p>{{replyPreview}}</p><p><a href="{{ticketUrl}}">View Ticket</a></p>'),
('saved_job_updated', 'A Job You Saved Has Been Updated', '<p>The job "<strong>{{jobTitle}}</strong>" has been updated.</p><p><a href="{{jobUrl}}">View Updated Job</a></p>')
ON DUPLICATE KEY UPDATE html_body = VALUES(html_body);
