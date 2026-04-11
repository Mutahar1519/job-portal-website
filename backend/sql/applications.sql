-- Applications table updates (MySQL)
-- Run these statements against the job_portal database.

CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  job_id INT NOT NULL,
  full_name VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  country VARCHAR(100) NULL,
  cover_letter TEXT NOT NULL,
  cv_path VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- MySQL versions before 8.0.29 do not support IF NOT EXISTS on ADD COLUMN.
-- Run only the statements you need (skip any column that already exists).
ALTER TABLE applications ADD COLUMN full_name VARCHAR(255) NULL;
ALTER TABLE applications ADD COLUMN email VARCHAR(255) NULL;
ALTER TABLE applications ADD COLUMN phone VARCHAR(50) NULL;
ALTER TABLE applications ADD COLUMN country VARCHAR(100) NULL;
ALTER TABLE applications ADD COLUMN cover_letter TEXT NOT NULL;
ALTER TABLE applications ADD COLUMN cv_path VARCHAR(255) NULL;
ALTER TABLE applications ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE applications ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Candidate ranking and interview tracking fields
ALTER TABLE applications ADD COLUMN score TINYINT UNSIGNED NULL;
ALTER TABLE applications ADD COLUMN interview_status VARCHAR(30) NOT NULL DEFAULT 'not_started';
ALTER TABLE applications ADD COLUMN interview_notes TEXT NULL;
