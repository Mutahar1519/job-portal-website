-- Background checks table
-- Run against job_portal database.

CREATE TABLE IF NOT EXISTS background_checks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  job_id INT NOT NULL,
  employer_user_id INT NOT NULL,
  candidate_user_id INT NOT NULL,
  provider VARCHAR(80) NOT NULL DEFAULT 'internal',
  package_name VARCHAR(80) NOT NULL DEFAULT 'standard',
  status ENUM('pending', 'in_progress', 'clear', 'consider', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  reference_code VARCHAR(64) NULL,
  result_summary VARCHAR(1000) NULL,
  notes TEXT NULL,
  ordered_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_bg_application (application_id),
  KEY idx_bg_candidate (candidate_user_id),
  KEY idx_bg_employer (employer_user_id),
  CONSTRAINT fk_bg_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_bg_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_bg_employer FOREIGN KEY (employer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bg_candidate FOREIGN KEY (candidate_user_id) REFERENCES users(id) ON DELETE CASCADE
);
