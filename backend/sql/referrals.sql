-- Referral bonus program tables
-- Run against the job_portal database.

CREATE TABLE IF NOT EXISTS referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referrer_user_id INT NOT NULL,
  referred_name VARCHAR(160) NULL,
  referred_email VARCHAR(255) NOT NULL,
  referral_code VARCHAR(32) NOT NULL,
  note TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  hired_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_referral_email_code (referrer_user_id, referred_email),
  KEY idx_referrer (referrer_user_id),
  CONSTRAINT fk_referrals_referrer FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referral_id INT NOT NULL,
  referrer_user_id INT NOT NULL,
  amount_cents INT NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  status VARCHAR(30) NOT NULL DEFAULT 'earned',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_reward_referral (referral_id),
  KEY idx_referrer_rewards (referrer_user_id),
  CONSTRAINT fk_rewards_referral FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
  CONSTRAINT fk_rewards_referrer FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE
);
