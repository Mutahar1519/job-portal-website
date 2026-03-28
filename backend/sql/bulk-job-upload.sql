-- Bulk upload support log table (optional analytics/audit)
-- Core bulk upload works without this table, but this keeps an audit trail.

CREATE TABLE IF NOT EXISTS job_bulk_upload_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  created_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_job_bulk_upload_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
