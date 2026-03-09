-- Reviews table (MySQL)
-- Run these statements against the job_portal database.

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(120) NOT NULL,
  email VARCHAR(255) NULL,
  rating TINYINT NOT NULL,
  message VARCHAR(600) NOT NULL,
  approved TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MySQL versions before 8.0.29 do not support IF NOT EXISTS on ADD COLUMN.
-- Run only the statements you need (skip any column that already exists).
ALTER TABLE reviews ADD COLUMN name VARCHAR(120) NOT NULL;
ALTER TABLE reviews ADD COLUMN role VARCHAR(120) NOT NULL;
ALTER TABLE reviews ADD COLUMN email VARCHAR(255) NULL;
ALTER TABLE reviews ADD COLUMN rating TINYINT NOT NULL;
ALTER TABLE reviews ADD COLUMN message VARCHAR(600) NOT NULL;
ALTER TABLE reviews ADD COLUMN approved TINYINT NOT NULL DEFAULT 0;
ALTER TABLE reviews ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
