-- Advanced Job Search & Saved Searches schema migration
-- Run against the job_portal database after the base schema is in place.

-- New columns on jobs table for structured salary, experience, remote, benefits
ALTER TABLE jobs ADD COLUMN salary_min INT NULL;
ALTER TABLE jobs ADD COLUMN salary_max INT NULL;
ALTER TABLE jobs ADD COLUMN experience_level VARCHAR(50) NULL;
ALTER TABLE jobs ADD COLUMN is_remote TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN benefits TEXT NULL;

-- Saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  name        VARCHAR(255) NOT NULL,
  filters     JSON NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_saved_searches_user (user_id)
);
