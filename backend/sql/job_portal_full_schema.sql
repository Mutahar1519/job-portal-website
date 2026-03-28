-- Job Portal canonical schema (MySQL 8+)
-- Aligned with specification: Job Seeker, Employer, Administrator
-- Safe to run on a fresh database.

CREATE DATABASE IF NOT EXISTS job_portal;
USE job_portal;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('job_seeker', 'employer', 'admin') NOT NULL DEFAULT 'job_seeker',
  phone VARCHAR(30) NULL,
  country VARCHAR(100) NULL,
  city VARCHAR(100) NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  is_blocked TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- COMPANIES TABLE
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
  CONSTRAINT fk_company_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- JOBS TABLE
CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  job_type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  is_premium TINYINT(1) NOT NULL DEFAULT 0,
  is_approved TINYINT(1) NOT NULL DEFAULT 0,
  posted_by INT NOT NULL,
  company_id INT NULL,
  is_shift TINYINT(1) NOT NULL DEFAULT 0,
  shift_start DATETIME NULL,
  shift_end DATETIME NULL,
  shift_pay_cents INT NULL,
  shift_fee_cents INT NULL,
  shift_total_cents INT NULL,
  shift_currency VARCHAR(10) DEFAULT 'usd',
  shift_paid TINYINT(1) DEFAULT 0,
  shift_status VARCHAR(50) DEFAULT 'open',
  application_deadline DATETIME NULL,
  repost_of_job_id INT NULL,
  reboost_count INT NOT NULL DEFAULT 0,
  last_reboosted_at DATETIME NULL,
  moderation_status VARCHAR(40) NULL,
  moderation_score INT NULL,
  moderation_reason VARCHAR(500) NULL,
  auto_approved_at DATETIME NULL,
  image_url VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_jobs_location (location),
  INDEX idx_jobs_type (job_type),
  INDEX idx_jobs_category (category),
  INDEX idx_jobs_is_approved (is_approved),
  INDEX idx_jobs_repost_of_job_id (repost_of_job_id),
  FULLTEXT INDEX ftx_jobs_title_description (title, description),
  CONSTRAINT fk_jobs_posted_by FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_jobs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_jobs_repost_parent FOREIGN KEY (repost_of_job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

-- APPLICATIONS TABLE
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
  pipeline_stage VARCHAR(30) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_job_application (user_id, job_id),
  INDEX idx_application_status (status),
  CONSTRAINT fk_app_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- SAVED JOBS TABLE
CREATE TABLE IF NOT EXISTS saved_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  job_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_saved_job (user_id, job_id),
  CONSTRAINT fk_saved_job_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_job_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- JOB ALERTS TABLE
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
  CONSTRAINT fk_alert_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- RESUMES TABLE
CREATE TABLE IF NOT EXISTS resumes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  extracted_text LONGTEXT NULL,
  parsed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_resume_user (user_id),
  CONSTRAINT fk_resume_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- APPLICATION MESSAGES TABLE
CREATE TABLE IF NOT EXISTS application_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_msg_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_msg_user FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- SYSTEM ACTIVITY TABLE
CREATE TABLE IF NOT EXISTS system_activity (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(120) NOT NULL,
  email VARCHAR(255) NULL,
  rating TINYINT NOT NULL,
  message VARCHAR(600) NOT NULL,
  approved TINYINT NOT NULL DEFAULT 0,
  is_hidden TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- JOB SEEKER PROFILES TABLE
CREATE TABLE IF NOT EXISTS job_seeker_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  photo_url VARCHAR(255) NULL,
  dob DATE NULL,
  gender VARCHAR(20) NULL,
  address VARCHAR(255) NULL,
  location VARCHAR(200) NULL,
  linkedin_url VARCHAR(255) NULL,
  portfolio_url VARCHAR(255) NULL,
  job_title VARCHAR(150) NULL,
  skills TEXT NULL,
  experience_years INT NULL,
  current_company VARCHAR(150) NULL,
  expected_salary VARCHAR(100) NULL,
  preferred_job_type VARCHAR(100) NULL,
  resume_url VARCHAR(255) NULL,
  about TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_job_seeker_user (user_id),
  CONSTRAINT fk_job_seeker_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- SHIFT ESCROW & NOTIFICATIONS TABLES
CREATE TABLE IF NOT EXISTS shift_escrows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  application_id INT NOT NULL,
  client_id INT NOT NULL,
  worker_id INT NOT NULL,
  pay_cents INT NOT NULL,
  fee_cents INT NOT NULL,
  total_cents INT NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  status VARCHAR(30) NOT NULL DEFAULT 'awaiting_confirmation',
  client_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  worker_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  dispute_reason VARCHAR(255) NULL,
  dispute_note TEXT NULL,
  disputed_at DATETIME NULL,
  refunded_at DATETIME NULL,
  release_at DATETIME NOT NULL,
  released_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_shift_application (application_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shift_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  job_id INT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'posted',
  paid_at DATETIME NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uniq_shift_notification (user_id, job_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- EMPLOYER PROFILES TABLE
CREATE TABLE IF NOT EXISTS employer_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  company_name VARCHAR(200) NOT NULL,
  company_phone VARCHAR(30) NULL,
  company_address VARCHAR(255) NULL,
  company_location VARCHAR(200) NULL,
  website VARCHAR(255) NULL,
  industry VARCHAR(100) NULL,
  company_size VARCHAR(50) NULL,
  founded_year INT NULL,
  description TEXT NULL,
  registration_number VARCHAR(100) NULL,
  linkedin_url VARCHAR(255) NULL,
  tax_id VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_employer_user (user_id),
  CONSTRAINT fk_employer_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- PASSWORD RESET TOKENS TABLE
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_password_reset_token (token_hash),
  INDEX idx_password_resets_user (user_id),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- EMAIL VERIFICATION TOKENS TABLE
CREATE TABLE IF NOT EXISTS email_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_email_verification_token (token_hash),
  INDEX idx_email_verifications_user (user_id),
  CONSTRAINT fk_email_verification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
