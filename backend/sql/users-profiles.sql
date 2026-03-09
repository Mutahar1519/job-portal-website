-- Users + profiles schema additions (MySQL)
-- Run only the statements you need (skip any column/index that already exists).
-- MySQL versions before 8.0.29 do not support IF NOT EXISTS on ADD COLUMN.

-- Users: role + contact
ALTER TABLE users ADD COLUMN role ENUM('job_seeker','employer','admin') NOT NULL DEFAULT 'job_seeker';
ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL;
ALTER TABLE users ADD COLUMN country VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN city VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Job seeker profiles
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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Employer profiles (optional extension for extra company verification fields)
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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_password_reset_token (token_hash),
  INDEX idx_password_resets_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_email_verification_token (token_hash),
  INDEX idx_email_verifications_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
