-- Job Portal canonical schema (MySQL 8+)
-- Aligned with specification: Job Seeker, Employer, Administrator
-- Safe to run on a fresh database.

CREATE DATABASE IF NOT EXISTS job_portal;
USE job_portal;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('job_seeker', 'employer', 'admin') NOT NULL DEFAULT 'job_seeker',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- JOBS TABLE
CREATE TABLE IF NOT EXISTS jobs (
  job_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  company VARCHAR(180) NOT NULL,
  company_logo VARCHAR(255) NULL,
  location VARCHAR(150) NOT NULL,
  salary VARCHAR(120) NULL,
  job_type VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  tags JSON NULL,
  employer_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_jobs_employer FOREIGN KEY (employer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_jobs_location (location),
  INDEX idx_jobs_type (job_type),
  FULLTEXT INDEX ftx_jobs_title_description (title, description)
);

-- APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS applications (
  application_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  job_id INT NOT NULL,
  status ENUM('pending', 'reviewed', 'shortlisted', 'rejected', 'hired') NOT NULL DEFAULT 'pending',
  applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cover_letter TEXT NULL,
  resume_url VARCHAR(255) NULL,
  CONSTRAINT fk_app_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_app_job FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
  UNIQUE KEY uniq_user_job_application (user_id, job_id),
  INDEX idx_application_status (status)
);

-- Optional system activity table for admin monitoring
CREATE TABLE IF NOT EXISTS system_activity (
  activity_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_actor FOREIGN KEY (actor_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Seed a default administrator (change password after first login)
-- password below is bcrypt hash placeholder for "Admin@123"
INSERT INTO users (name, email, password, role)
SELECT 'System Admin', 'admin@jobportal.local', '$2b$10$KXw8xkE9Fv3wJ6y8Qx5eAuWzM8ytY2wYw8j8x4QwK4uQ1h7NwK0dq', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin@jobportal.local'
);
