const crypto = require("crypto");
const db = require("../config/mysql");

const DEFAULT_REWARD_CENTS = Number(process.env.REFERRAL_REWARD_CENTS || 2500);

const ensureReferralTables = (callback) => {
  const createReferralsTable = `
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
    )
  `;

  const createRewardsTable = `
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
    )
  `;

  db.query(createReferralsTable, (refErr) => {
    if (refErr) return callback(refErr);
    db.query(createRewardsTable, (rewardErr) => {
      if (rewardErr) return callback(rewardErr);
      return callback(null);
    });
  });
};

const toTitle = (value) => {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 160);
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase().slice(0, 255);

exports.createReferral = (req, res) => {
  const userId = req.user.id;
  const referredName = toTitle(req.body.referred_name || "");
  const referredEmail = normalizeEmail(req.body.referred_email || "");
  const note = String(req.body.note || "").trim().slice(0, 1000);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!referredEmail || !emailRegex.test(referredEmail)) {
    return res.status(400).json({ message: "Valid referred email is required" });
  }

  ensureReferralTables((ensureErr) => {
    if (ensureErr) return res.status(500).json({ message: "Failed to initialize referral tables", error: ensureErr.message });

    db.query("SELECT email FROM users WHERE id = ? LIMIT 1", [userId], (userErr, userRows) => {
      if (userErr) return res.status(500).json({ message: "DB error", error: userErr.message });
      const referrerEmail = normalizeEmail(userRows?.[0]?.email || "");

      if (referrerEmail && referredEmail === referrerEmail) {
        return res.status(400).json({ message: "You cannot refer your own email" });
      }

      db.query(
        "SELECT id, status FROM referrals WHERE referrer_user_id = ? AND referred_email = ? LIMIT 1",
        [userId, referredEmail],
        (dupErr, dupRows) => {
          if (dupErr) return res.status(500).json({ message: "DB error", error: dupErr.message });
          if (dupRows.length) {
            return res.status(409).json({ message: "You already referred this person", referral: dupRows[0] });
          }

          const referralCode = crypto.randomBytes(8).toString("hex");
          const insertSql = `
            INSERT INTO referrals (referrer_user_id, referred_name, referred_email, referral_code, note, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
          `;

          db.query(insertSql, [userId, referredName || null, referredEmail, referralCode, note || null], (insertErr, result) => {
            if (insertErr) return res.status(500).json({ message: "Failed to create referral", error: insertErr.message });
            return res.status(201).json({
              id: result.insertId,
              referred_name: referredName || null,
              referred_email: referredEmail,
              referral_code: referralCode,
              status: "pending"
            });
          });
        }
      );
    });
  });
};

exports.getMyReferrals = (req, res) => {
  const userId = req.user.id;

  ensureReferralTables((ensureErr) => {
    if (ensureErr) return res.status(500).json({ message: "Failed to initialize referral tables", error: ensureErr.message });

    db.query(
      `
        SELECT
          r.id,
          r.referred_name,
          r.referred_email,
          r.referral_code,
          r.note,
          r.status,
          r.hired_at,
          r.created_at,
          rr.amount_cents,
          rr.currency,
          rr.status AS reward_status
        FROM referrals r
        LEFT JOIN referral_rewards rr ON rr.referral_id = r.id
        WHERE r.referrer_user_id = ?
        ORDER BY r.created_at DESC
      `,
      [userId],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err.message });
        return res.json(rows);
      }
    );
  });
};

exports.getMyReferralRewards = (req, res) => {
  const userId = req.user.id;

  ensureReferralTables((ensureErr) => {
    if (ensureErr) return res.status(500).json({ message: "Failed to initialize referral tables", error: ensureErr.message });

    db.query(
      `
        SELECT
          COUNT(*) AS reward_count,
          COALESCE(SUM(amount_cents), 0) AS total_earned_cents,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END), 0) AS total_paid_cents,
          COALESCE(SUM(CASE WHEN status <> 'paid' THEN amount_cents ELSE 0 END), 0) AS total_pending_cents
        FROM referral_rewards
        WHERE referrer_user_id = ?
      `,
      [userId],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err.message });
        return res.json(rows[0] || {
          reward_count: 0,
          total_earned_cents: 0,
          total_paid_cents: 0,
          total_pending_cents: 0
        });
      }
    );
  });
};

exports.markReferralHired = (req, res) => {
  const referralId = Number(req.params.id);
  if (!referralId) return res.status(400).json({ message: "Invalid referral id" });

  ensureReferralTables((ensureErr) => {
    if (ensureErr) return res.status(500).json({ message: "Failed to initialize referral tables", error: ensureErr.message });

    db.query("SELECT * FROM referrals WHERE id = ? LIMIT 1", [referralId], (findErr, rows) => {
      if (findErr) return res.status(500).json({ message: "DB error", error: findErr.message });
      if (!rows.length) return res.status(404).json({ message: "Referral not found" });

      const referral = rows[0];
      if (referral.status === "hired") {
        return res.json({ message: "Referral already marked hired" });
      }

      db.query(
        "UPDATE referrals SET status = 'hired', hired_at = NOW() WHERE id = ?",
        [referralId],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ message: "Failed to update referral", error: updateErr.message });

          db.query(
            "SELECT id FROM referral_rewards WHERE referral_id = ? LIMIT 1",
            [referralId],
            (rewardCheckErr, rewardRows) => {
              if (rewardCheckErr) return res.status(500).json({ message: "DB error", error: rewardCheckErr.message });
              if (rewardRows.length) return res.json({ message: "Referral marked hired" });

              db.query(
                `
                  INSERT INTO referral_rewards (referral_id, referrer_user_id, amount_cents, currency, status)
                  VALUES (?, ?, ?, 'usd', 'earned')
                `,
                [referralId, referral.referrer_user_id, DEFAULT_REWARD_CENTS],
                (rewardInsertErr) => {
                  if (rewardInsertErr) return res.status(500).json({ message: "Failed to create reward", error: rewardInsertErr.message });
                  return res.json({ message: "Referral marked hired and reward granted" });
                }
              );
            }
          );
        }
      );
    });
  });
};
