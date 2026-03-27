-- Shift escrow schema (MySQL)
-- Run these statements against the job_portal database.
-- MySQL versions before 8.0.29 do not support IF NOT EXISTS on ADD COLUMN.
-- Run only the statements you need (skip any column/index that already exists).

-- Jobs: shift fields
ALTER TABLE jobs ADD COLUMN is_shift TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN shift_start DATETIME NULL;
ALTER TABLE jobs ADD COLUMN shift_end DATETIME NULL;
ALTER TABLE jobs ADD COLUMN shift_pay_cents INT NULL;
ALTER TABLE jobs ADD COLUMN shift_fee_cents INT NULL;
ALTER TABLE jobs ADD COLUMN shift_total_cents INT NULL;
ALTER TABLE jobs ADD COLUMN shift_currency VARCHAR(10) NOT NULL DEFAULT 'usd';
ALTER TABLE jobs ADD COLUMN shift_paid TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN shift_status VARCHAR(30) NOT NULL DEFAULT 'open';

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
  payment_method VARCHAR(40) NOT NULL DEFAULT 'card',
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

-- Shift notifications (in-app)
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
