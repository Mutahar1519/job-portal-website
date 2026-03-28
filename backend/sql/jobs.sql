-- Jobs table updates (MySQL)
-- Run these statements against the job_portal database.

CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  job_type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  is_premium TINYINT(1) NOT NULL DEFAULT 0,
  is_approved TINYINT(1) NOT NULL DEFAULT 0,
  application_deadline DATETIME NULL,
  repost_of_job_id INT NULL,
  reboost_count INT NOT NULL DEFAULT 0,
  last_reboosted_at DATETIME NULL,
  moderation_status VARCHAR(40) NULL,
  moderation_score INT NULL,
  moderation_reason VARCHAR(500) NULL,
  auto_approved_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MySQL versions before 8.0.29 do not support IF NOT EXISTS on ADD COLUMN.
-- Run only the statements you need (skip any column that already exists).
ALTER TABLE jobs ADD COLUMN job_type VARCHAR(100) NOT NULL DEFAULT 'Full-time';
ALTER TABLE jobs ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT 'General';
ALTER TABLE jobs ADD COLUMN is_premium TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN is_approved TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN application_deadline DATETIME NULL;
ALTER TABLE jobs ADD COLUMN repost_of_job_id INT NULL;
ALTER TABLE jobs ADD COLUMN reboost_count INT NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN last_reboosted_at DATETIME NULL;
ALTER TABLE jobs ADD COLUMN moderation_status VARCHAR(40) NULL;
ALTER TABLE jobs ADD COLUMN moderation_score INT NULL;
ALTER TABLE jobs ADD COLUMN moderation_reason VARCHAR(500) NULL;
ALTER TABLE jobs ADD COLUMN auto_approved_at DATETIME NULL;
ALTER TABLE jobs ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Optional lineage constraint if your dataset is clean and the parent IDs exist.
ALTER TABLE jobs
  ADD CONSTRAINT fk_jobs_repost_parent
  FOREIGN KEY (repost_of_job_id) REFERENCES jobs(id)
  ON DELETE SET NULL;
