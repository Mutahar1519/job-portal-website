-- Job expiration and renewal columns (MySQL)
-- Run against job_portal database.

-- For MySQL versions without ADD COLUMN IF NOT EXISTS support,
-- run each statement once and skip if the column already exists.
ALTER TABLE jobs ADD COLUMN expires_at DATETIME NULL;
ALTER TABLE jobs ADD COLUMN renewal_count INT NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN last_renewed_at DATETIME NULL;

-- Initialize expires_at for existing jobs where missing
UPDATE jobs
SET expires_at = DATE_ADD(created_at, INTERVAL 30 DAY)
WHERE expires_at IS NULL;
