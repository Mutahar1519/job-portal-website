-- Interview scheduling tables
-- Run against job_portal database.

CREATE TABLE IF NOT EXISTS interviews_scheduled (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  job_id INT NOT NULL,
  employer_user_id INT NOT NULL,
  candidate_user_id INT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  meeting_type ENUM('video', 'phone', 'onsite') NOT NULL DEFAULT 'video',
  meeting_link VARCHAR(500) NULL,
  notes TEXT NULL,
  status ENUM('scheduled', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_interviews_candidate (candidate_user_id, scheduled_at),
  KEY idx_interviews_employer (employer_user_id, scheduled_at),
  KEY idx_interviews_application (application_id),
  CONSTRAINT fk_interviews_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_interviews_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_interviews_employer FOREIGN KEY (employer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_interviews_candidate FOREIGN KEY (candidate_user_id) REFERENCES users(id) ON DELETE CASCADE
);
