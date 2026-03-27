-- Feature upgrades schema (MySQL)
-- Run these statements against the job_portal database.
-- MySQL versions before 8.0.29 do not support IF NOT EXISTS on ADD COLUMN.
-- Run only the statements you need (skip any column/index that already exists).

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_user_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  website VARCHAR(255) NULL,
  location VARCHAR(200) NULL,
  size VARCHAR(50) NULL,
  industry VARCHAR(100) NULL,
  description TEXT NULL,
  logo_url VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_company_owner (owner_user_id),
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Jobs: link to employer + company
ALTER TABLE jobs ADD COLUMN posted_by INT NULL;
ALTER TABLE jobs ADD COLUMN company_id INT NULL;
ALTER TABLE jobs ADD COLUMN application_deadline DATETIME NULL;
ALTER TABLE jobs ADD COLUMN moderation_status VARCHAR(40) NULL;
ALTER TABLE jobs ADD COLUMN moderation_score INT NULL;
ALTER TABLE jobs ADD COLUMN moderation_reason VARCHAR(500) NULL;
ALTER TABLE jobs ADD COLUMN auto_approved_at DATETIME NULL;
ALTER TABLE jobs ADD COLUMN image_url VARCHAR(500) NULL;
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_posted_by FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- Saved jobs
CREATE TABLE IF NOT EXISTS saved_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  job_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_saved_job (user_id, job_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Job alerts
CREATE TABLE IF NOT EXISTS job_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  keyword VARCHAR(200) NULL,
  location VARCHAR(200) NULL,
  category VARCHAR(100) NULL,
  job_type VARCHAR(100) NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Resumes (parsed)
CREATE TABLE IF NOT EXISTS resumes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  extracted_text LONGTEXT NULL,
  parsed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_resume_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Application messages
CREATE TABLE IF NOT EXISTS application_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Applications: pipeline stage
ALTER TABLE applications ADD COLUMN pipeline_stage VARCHAR(30) NOT NULL DEFAULT 'new';

-- Platform settings
CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Company/employer targeted reviews
CREATE TABLE IF NOT EXISTS company_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  employer_user_id INT NULL,
  job_id INT NULL,
  reviewer_name VARCHAR(120) NOT NULL,
  reviewer_role VARCHAR(120) NOT NULL,
  reviewer_email VARCHAR(255) NULL,
  rating TINYINT NOT NULL,
  message VARCHAR(600) NOT NULL,
  approved TINYINT NOT NULL DEFAULT 0,
  is_hidden TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_company_reviews_company (company_id),
  INDEX idx_company_reviews_employer (employer_user_id),
  INDEX idx_company_reviews_job (job_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (employer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);
