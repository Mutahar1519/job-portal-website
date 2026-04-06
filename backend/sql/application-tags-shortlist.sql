-- Application tags and shortlisting schema (MySQL)
-- Run these statements against the job_portal database.

-- Tags for applications (many-to-many)
CREATE TABLE IF NOT EXISTS application_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_app_tag (application_id, tag),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Shortlist flag for applications
ALTER TABLE applications ADD COLUMN shortlisted TINYINT(1) NOT NULL DEFAULT 0;
