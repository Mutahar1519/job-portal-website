const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const adminAuth = require("../middleware/adminAuth");
const db = require("../config/mysql");
const { sendMail } = require("../utils/mailer");
const { notifyShiftAlerts } = require("../utils/shiftAlerts");
const { getPlatformSetting, setPlatformSetting, toBooleanSetting } = require("../utils/platformSettings");

const DEFAULT_AUTO_APPROVAL_ENABLED = process.env.AUTO_APPROVE_JOBS !== "false";
const ADMIN_APPROVER_EMAIL = String(process.env.ADMIN_APPROVER_EMAIL || "").trim().toLowerCase();
const ADMIN_GRANT_TTL_MINUTES = 30;

const resolveAdminApproverEmail = (req) => {
  const fallback = String(req?.user?.email || "").trim().toLowerCase();
  return ADMIN_APPROVER_EMAIL || fallback || "admin@localhost";
};

const ensureColumn = (tableName, columnName, ddl, label) => {
  db.query(
    `SELECT 1 AS ok
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName],
    (checkErr, rows) => {
      if (checkErr) {
        console.warn(`${label} bootstrap check failed:`, checkErr.message);
        return;
      }

      if (rows.length) return;

      db.query(ddl, (alterErr) => {
        if (alterErr && alterErr.code !== "ER_DUP_FIELDNAME") {
          console.warn(`${label} bootstrap failed:`, alterErr.message);
        }
      });
    }
  );
};

// Best-effort schema bootstrap for review moderation state.
ensureColumn(
  "reviews",
  "is_hidden",
  "ALTER TABLE reviews ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0",
  "reviews.is_hidden"
);

ensureColumn(
  "users",
  "is_blocked",
  "ALTER TABLE users ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0",
  "users.is_blocked"
);

ensureColumn(
  "companies",
  "verification_status",
  "ALTER TABLE companies ADD COLUMN verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'",
  "companies.verification_status"
);

ensureColumn(
  "companies",
  "verification_notes",
  "ALTER TABLE companies ADD COLUMN verification_notes TEXT NULL",
  "companies.verification_notes"
);

ensureColumn(
  "companies",
  "verified_by_admin_id",
  "ALTER TABLE companies ADD COLUMN verified_by_admin_id INT NULL",
  "companies.verified_by_admin_id"
);

ensureColumn(
  "companies",
  "verified_at",
  "ALTER TABLE companies ADD COLUMN verified_at DATETIME NULL",
  "companies.verified_at"
);

db.query(
  `CREATE TABLE IF NOT EXISTS company_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    user_id INT NULL,
    reviewer_name VARCHAR(120),
    rating TINYINT NOT NULL,
    message TEXT,
    approved TINYINT(1) DEFAULT 0,
    is_hidden TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_company_reviews_company (company_id),
    INDEX idx_company_reviews_status (approved, is_hidden)
  )`,
  (err) => {
    if (err) {
      console.warn("company_reviews bootstrap failed:", err.message);
    }
  }
);

const getReviewSource = (value) => {
  const source = String(value || "portal").toLowerCase();
  if (source === "company" || source === "all") return source;
  return "portal";
};

const buildReviewWhereClause = (status) => {
  const filters = {
    pending: "approved = 0",
    approved: "approved = 1 AND is_hidden = 0",
    hidden: "approved = 1 AND is_hidden = 1",
    all: "1 = 1"
  };

  return filters[status] || filters.pending;
};

db.query(
  `CREATE TABLE IF NOT EXISTS admin_role_grants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    target_user_id INT NOT NULL,
    requested_by_admin_id INT NOT NULL,
    approver_email VARCHAR(255) NOT NULL,
    approval_code VARCHAR(12) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at DATETIME NOT NULL,
    approved_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_grants_target (target_user_id),
    INDEX idx_admin_grants_status (status)
  )`,
  (err) => {
    if (err) {
      console.warn("admin_role_grants bootstrap failed:", err.message);
    }
  }
);

router.get("/settings/auto-approval", adminAuth, async (req, res) => {
  const raw = await getPlatformSetting("auto_approve_jobs", String(DEFAULT_AUTO_APPROVAL_ENABLED));
  const enabled = toBooleanSetting(raw, DEFAULT_AUTO_APPROVAL_ENABLED);
  const configured = process.env.OPENAI_API_KEY ? true : false;

  res.json({
    enabled,
    ai_provider: configured ? "openai" : "heuristic-only"
  });
});

router.put("/settings/auto-approval", adminAuth, async (req, res) => {
  const enabled = toBooleanSetting(req.body && req.body.enabled, DEFAULT_AUTO_APPROVAL_ENABLED);

  try {
    await setPlatformSetting("auto_approve_jobs", enabled ? "1" : "0");
    res.json({ message: "Auto-approval setting updated", enabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Get all users */
router.get("/users", adminAuth, (req, res) => {
  db.query(
    "SELECT id, name, role, verified, is_admin, is_blocked, created_at FROM users ORDER BY created_at DESC",
    (err, users) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(users);
    }
  );
});

/* Block/unblock user */
router.put("/users/:id/block", adminAuth, (req, res) => {
  const userId = Number(req.params.id);
  const blocked = req.body && req.body.blocked ? 1 : 0;

  if (!userId) return res.status(400).json({ message: "Invalid user" });
  if (userId === req.user.id) return res.status(400).json({ message: "You cannot block your own account" });

  db.query(
    "UPDATE users SET is_blocked = ? WHERE id = ?",
    [blocked, userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
      res.json({ message: blocked ? "User blocked" : "User unblocked" });
    }
  );
});
router.put("/users/:id/verify", adminAuth, (req, res) => {
  const userId = Number(req.params.id);
  const verified = req.body && req.body.verified ? 1 : 0;

  if (!userId) return res.status(400).json({ message: "Invalid user" });

  db.query(
    "UPDATE users SET verified = ? WHERE id = ?",
    [verified, userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
      res.json({ message: verified ? "User verified" : "User marked unverified" });
    }
  );
});
/* Delete user account */
router.delete("/users/:id", adminAuth, (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ message: "Invalid user" });
  if (userId === req.user.id) return res.status(400).json({ message: "You cannot delete your own account" });

  db.query("DELETE FROM users WHERE id = ?", [userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User account deleted" });
  });
});

/* Request admin grant approval */
router.post("/users/:id/request-admin-grant", adminAuth, (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ message: "Invalid user" });

  const approverEmail = resolveAdminApproverEmail(req);

  db.query("SELECT id, name, email, is_admin FROM users WHERE id = ?", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    if (rows[0].is_admin) return res.status(400).json({ message: "User is already an admin" });

    const target = rows[0];
    const approvalCode = String(crypto.randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + ADMIN_GRANT_TTL_MINUTES * 60 * 1000);

    db.query(
      "UPDATE admin_role_grants SET status = 'expired' WHERE target_user_id = ? AND status = 'pending'",
      [userId],
      () => {
        db.query(
          `INSERT INTO admin_role_grants
            (target_user_id, requested_by_admin_id, approver_email, approval_code, status, expires_at)
           VALUES (?, ?, ?, ?, 'pending', ?)`,
          [userId, req.user.id, approverEmail, approvalCode, expiresAt],
          (insertErr) => {
            if (insertErr) return res.status(500).json({ error: insertErr.message });

            const message = `Admin role grant requested for user ${target.name} (${target.email}).\nApproval code: ${approvalCode}\nExpires in ${ADMIN_GRANT_TTL_MINUTES} minutes.`;

            sendMail({
              to: approverEmail,
              subject: "JobPortal admin promotion approval required",
              text: message
            })
              .then((result) => {
                if (!result) {
                  console.warn(`[AdminGrant] Email delivery unavailable. Share this code with ${approverEmail}: ${approvalCode}`);
                }
              })
              .catch((mailErr) => console.error("Admin grant email failed:", mailErr.message));

            res.json({
              message: `Approval requested. Ask ${approverEmail} for the approval code.`,
              approver_email: approverEmail,
              expires_in_minutes: ADMIN_GRANT_TTL_MINUTES
            });
          }
        );
      }
    );
  });
});

/* Promote user to admin with approval code */
router.put("/users/:id/make-admin", adminAuth, (req, res) => {
  const userId = Number(req.params.id);
  const approvalEmail = String((req.body && req.body.approvalEmail) || "").trim().toLowerCase();
  const approvalCode = String((req.body && req.body.approvalCode) || "").trim();

  if (!userId) return res.status(400).json({ message: "Invalid user" });
  if (!approvalCode) return res.status(400).json({ message: "Approval code is required" });

  const sql = approvalEmail
    ? `SELECT id, approver_email
       FROM admin_role_grants
       WHERE target_user_id = ?
         AND approver_email = ?
         AND approval_code = ?
         AND status = 'pending'
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`
    : `SELECT id, approver_email
       FROM admin_role_grants
       WHERE target_user_id = ?
         AND approval_code = ?
         AND status = 'pending'
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`;

  const params = approvalEmail
    ? [userId, approvalEmail, approvalCode]
    : [userId, approvalCode];

  db.query(
    sql,
    params,
    (err, grants) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!grants.length) {
        return res.status(400).json({ message: "Invalid or expired approval code" });
      }

      const grantId = grants[0].id;
      db.query(
        "UPDATE users SET is_admin = 1, role = 'admin' WHERE id = ?",
        [userId],
        (updateErr, result) => {
          if (updateErr) return res.status(500).json({ error: updateErr.message });
          if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });

          db.query(
            "UPDATE admin_role_grants SET status = 'approved', approved_at = NOW() WHERE id = ?",
            [grantId],
            () => {
              res.json({ message: "User promoted to admin", approved_by: grants[0].approver_email });
            }
          );
        }
      );
    }
  );
});

/* Grant history (pending/approved/expired/all) */
router.get("/users/grants/history", adminAuth, (req, res) => {
  const status = String(req.query.status || "all").trim().toLowerCase();
  const allowed = new Set(["all", "pending", "approved", "expired"]);
  if (!allowed.has(status)) {
    return res.status(400).json({ message: "Invalid status filter" });
  }

  const effectiveStatusExpr = "CASE WHEN g.status = 'pending' AND g.expires_at <= NOW() THEN 'expired' ELSE g.status END";
  let sql = `
    SELECT g.id, g.target_user_id, g.requested_by_admin_id,
           g.approver_email, g.status, g.expires_at, g.approved_at, g.created_at,
           ${effectiveStatusExpr} AS effective_status,
           target.name AS target_name, target.email AS target_email,
           requester.name AS requested_by_name, requester.email AS requested_by_email
    FROM admin_role_grants g
    LEFT JOIN users target ON target.id = g.target_user_id
    LEFT JOIN users requester ON requester.id = g.requested_by_admin_id
  `;

  const params = [];
  if (status !== "all") {
    sql += ` WHERE ${effectiveStatusExpr} = ?`;
    params.push(status);
  }

  sql += " ORDER BY g.created_at DESC LIMIT 100";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// GET all jobs (admin)
router.get("/jobs", adminAuth, (req, res) => {
  db.query(
    `SELECT j.*, parent.title AS repost_of_title
     FROM jobs j
     LEFT JOIN jobs parent ON parent.id = j.repost_of_job_id
     ORDER BY j.is_premium DESC, j.created_at DESC`,
    (err, jobs) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(jobs);
    }
  );
});

// ADD job (admin)
router.post("/jobs", adminAuth, (req, res) => {
  const { title, location, job_type, description, is_premium } = req.body;
  const requestedCategory = String(req.body.category || "").trim();
  const categoryCustom = String(req.body.category_custom || "").trim();
  const category = requestedCategory.toLowerCase() === "other" ? categoryCustom : requestedCategory;

  if (!title || !location || !job_type || !category || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.query(
    "INSERT INTO jobs (title, location, job_type, category, description, is_premium, is_approved, posted_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [title, location, job_type, category, description, is_premium ? 1 : 0, 1, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      // Log admin job creation
      try {
        const { logJobAction } = require("../controllers/jobsController");
        if (result && result.insertId) {
          logJobAction(result.insertId, req.user.id, "admin", "created", { title, location, job_type, category });
        }
      } catch {}
      res.status(201).json({ message: "Job created", id: result.insertId });
    }
  );
});

// UPDATE job (admin)
router.put("/jobs/:id", adminAuth, (req, res) => {
  const { title, location, job_type, description, is_premium } = req.body;
  const requestedCategory = String(req.body.category || "").trim();
  const categoryCustom = String(req.body.category_custom || "").trim();
  const category = requestedCategory.toLowerCase() === "other" ? categoryCustom : requestedCategory;

  if (!title || !location || !job_type || !category || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.query(
    "UPDATE jobs SET title = ?, location = ?, job_type = ?, category = ?, description = ?, is_premium = ? WHERE id = ?",
    [title, location, job_type, category, description, is_premium ? 1 : 0, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Job not found" });
      // Log admin job update
      try {
        const { logJobAction } = require("../controllers/jobsController");
        logJobAction(Number(req.params.id), req.user.id, "admin", "edited", { title, location, job_type, category });
      } catch {}
      res.json({ message: "Job updated" });
    }
  );
});

// PREMIUM job
router.put("/jobs/:id/premium", adminAuth, (req, res) => {
  db.query(
    "UPDATE jobs SET is_premium = 1 WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Job not found" });
      res.json({ message: "Job marked premium" });
    }
  );
});

// APPROVE job
router.put("/jobs/:id/approve", adminAuth, (req, res) => {
  db.query(
    `UPDATE jobs
     SET is_approved = 1,
         moderation_status = 'approved_manual',
         moderation_reason = 'Approved by admin',
         moderation_score = CASE WHEN moderation_score IS NULL OR moderation_score = 0 THEN 100 ELSE moderation_score END
     WHERE id = ?`,
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Job not found" });
      // Log admin job approval
      try {
        const { logJobAction } = require("../controllers/jobsController");
        logJobAction(Number(req.params.id), req.user.id, "admin", "approved", {});
      } catch {}
      res.json({ message: "Job approved" });
    }
  );
});

// PURGE demo / test jobs (titles containing 'test', 'demo', 'sample', '[qa]')
// Must be defined BEFORE the /:id route so 'purge-demo' is not captured as an ID
router.delete("/jobs/purge-demo", adminAuth, (req, res) => {
  const sql = `
    DELETE FROM jobs
    WHERE LOWER(title) REGEXP '\\\\btest\\\\b|\\\\bdemo\\\\b|\\\\bsample\\\\b|\\\\bqa\\\\b|^\\\\[qa\\\\]'
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Purged ${result.affectedRows} job(s)`, count: result.affectedRows });
  });
});

// DELETE job
router.delete("/jobs/:id", adminAuth, (req, res) => {
  db.query(
    "DELETE FROM jobs WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Job not found" });
      // Log admin job deletion
      try {
        const { logJobAction } = require("../controllers/jobsController");
        logJobAction(Number(req.params.id), req.user.id, "admin", "deleted", {});
      } catch {}
      res.json({ message: "Job deleted" });
    }
  );
});

// VIEW applications per job (admin)
router.get("/jobs/:id/applications", adminAuth, (req, res) => {
  const sql = `
    SELECT a.id, a.status, a.created_at,
           COALESCE(NULLIF(TRIM(a.full_name), ''), u.name, 'Candidate') AS applicant_name,
           u.id AS user_id
    FROM applications a
    JOIN users u ON a.user_id = u.id
    WHERE a.job_id = ?
    ORDER BY a.created_at DESC
  `;

  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const safeRows = (results || []).map((row) => ({
      ...row,
      user_ref: `U${String(row.user_id || '').padStart(6, '0')}`
    }));
    res.json(safeRows);
  });
});

// PLATFORM STATS (admin)
router.get("/stats", adminAuth, (req, res) => {
  const stats = {};

  db.query("SELECT COUNT(*) AS total FROM jobs", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.totalJobs = rows[0].total;

    db.query("SELECT COUNT(*) AS total FROM applications", (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.totalApplications = rows[0].total;

      db.query("SELECT COUNT(*) AS total FROM jobs WHERE is_premium = 1", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.premiumJobs = rows[0].total;

        db.query("SELECT COUNT(*) AS total FROM jobs WHERE is_premium = 0", (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });
          stats.normalJobs = rows[0].total;

          db.query(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count FROM jobs GROUP BY month ORDER BY month DESC LIMIT 6",
            (err, rows) => {
              if (err) return res.status(500).json({ error: err.message });
              stats.monthlyJobs = rows.reverse();

              db.query(
                "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count FROM applications GROUP BY month ORDER BY month DESC LIMIT 6",
                (err, rows) => {
                  if (err) return res.status(500).json({ error: err.message });
                  stats.monthlyApplications = rows.reverse();
                  res.json(stats);
                }
              );
            }
          );
        });
      });
    });
  });
});

// REVIEWS (admin)
router.get("/reviews", adminAuth, (req, res) => {
  const status = String(req.query.status || "pending").toLowerCase();
  const source = getReviewSource(req.query.source);
  const where = buildReviewWhereClause(status);

  let sql = `
    SELECT id, 'portal' AS source, NULL AS company_id, name, role, email, rating, message, approved, is_hidden, created_at
    FROM reviews
    WHERE ${where}
  `;

  if (source === "company") {
    sql = `
      SELECT id, 'company' AS source, company_id, reviewer_name AS name, 'Company review' AS role, NULL AS email, rating, message, approved, is_hidden, created_at
      FROM company_reviews
      WHERE ${where}
    `;
  } else if (source === "all") {
    sql = `
      SELECT id, source, company_id, name, role, email, rating, message, approved, is_hidden, created_at
      FROM (
        SELECT id, 'portal' AS source, NULL AS company_id, name, role, email, rating, message, approved, is_hidden, created_at
        FROM reviews
        WHERE ${where}
        UNION ALL
        SELECT id, 'company' AS source, company_id, reviewer_name AS name, 'Company review' AS role, NULL AS email, rating, message, approved, is_hidden, created_at
        FROM company_reviews
        WHERE ${where}
      ) review_feed
    `;
  }

  db.query(
    `${sql} ORDER BY created_at DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.put("/reviews/:id/approve", adminAuth, (req, res) => {
  const table = getReviewSource(req.query.source) === "company" ? "company_reviews" : "reviews";
  db.query(
    `UPDATE ${table} SET approved = 1, is_hidden = 0 WHERE id = ?`,
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Review not found" });
      res.json({ message: "Review approved" });
    }
  );
});

router.put("/reviews/:id/hide", adminAuth, (req, res) => {
  const table = getReviewSource(req.query.source) === "company" ? "company_reviews" : "reviews";
  db.query(
    `UPDATE ${table} SET approved = 1, is_hidden = 1 WHERE id = ?`,
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Review not found" });
      res.json({ message: "Review hidden" });
    }
  );
});

router.put("/reviews/:id/unhide", adminAuth, (req, res) => {
  const table = getReviewSource(req.query.source) === "company" ? "company_reviews" : "reviews";
  db.query(
    `UPDATE ${table} SET approved = 1, is_hidden = 0 WHERE id = ?`,
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Review not found" });
      res.json({ message: "Review visible again" });
    }
  );
});

router.delete("/reviews/:id", adminAuth, (req, res) => {
  const table = getReviewSource(req.query.source) === "company" ? "company_reviews" : "reviews";
  db.query(
    `DELETE FROM ${table} WHERE id = ?`,
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Review not found" });
      res.json({ message: "Review deleted" });
    }
  );
});

// SHIFT ESCROWS (admin)
router.get("/shifts", adminAuth, (req, res) => {
  const status = (req.query.status || "").trim();
  const params = [];

  let sql = `
    SELECT e.*, j.title AS job_title,
           client.name AS client_name, worker.name AS worker_name
    FROM shift_escrows e
    JOIN jobs j ON e.job_id = j.id
    JOIN users client ON e.client_id = client.id
    JOIN users worker ON e.worker_id = worker.id
  `;

  if (status) {
    sql += " WHERE e.status = ?";
    params.push(status);
  }

  sql += " ORDER BY e.created_at DESC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post("/shifts/:jobId/notify", adminAuth, (req, res) => {
  const jobId = Number(req.params.jobId);
  const status = (req.body.status || "posted").trim();
  const paidAt = status === "paid" ? new Date() : null;

  if (!jobId) return res.status(400).json({ message: "Invalid job" });

  db.query("SELECT id, is_shift FROM jobs WHERE id = ?", [jobId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ message: "Job not found" });
    if (!rows[0].is_shift) {
      return res.status(400).json({ message: "Not a shift job" });
    }

    notifyShiftAlerts(jobId, { status, paidAt });
    res.json({ message: "Shift alerts resent" });
  });
});

router.put("/shifts/:id/dispute", adminAuth, (req, res) => {
  const id = Number(req.params.id);
  const reason = (req.body.reason || "").trim();
  const note = (req.body.note || "").trim();

  if (!id) return res.status(400).json({ message: "Invalid escrow" });

  db.query("SELECT job_id FROM shift_escrows WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ message: "Escrow not found" });

    const jobId = rows[0].job_id;
    db.query(
      "UPDATE shift_escrows SET status = 'disputed', dispute_reason = ?, dispute_note = ?, disputed_at = NOW() WHERE id = ?",
      [reason || null, note || null, id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        db.query(
          "UPDATE jobs SET shift_status = 'disputed' WHERE id = ?",
          [jobId],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Shift marked disputed" });
          }
        );
      }
    );
  });
});

router.put("/shifts/:id/refund", adminAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid escrow" });

  db.query("SELECT job_id FROM shift_escrows WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ message: "Escrow not found" });

    const jobId = rows[0].job_id;
    db.query(
      "UPDATE shift_escrows SET status = 'refunded', refunded_at = NOW() WHERE id = ?",
      [id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        db.query(
          "UPDATE jobs SET shift_status = 'refunded' WHERE id = ?",
          [jobId],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Shift refunded" });
          }
        );
      }
    );
  });
});

router.put("/shifts/:id/release", adminAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid escrow" });

  db.query("SELECT job_id FROM shift_escrows WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ message: "Escrow not found" });

    const jobId = rows[0].job_id;
    db.query(
      "UPDATE shift_escrows SET status = 'released', released_at = NOW() WHERE id = ?",
      [id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        db.query(
          "UPDATE jobs SET shift_status = 'completed' WHERE id = ?",
          [jobId],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Shift released" });
          }
        );
      }
    );
  });
});

// COMPANIES (admin)
router.get("/companies", adminAuth, (req, res) => {
  const richSql = `SELECT c.id, c.name, c.industry, c.location, c.website, c.logo_url, c.created_at,
                          c.owner_user_id,
                          COALESCE(NULLIF(TRIM(c.verification_status), ''), 'pending') AS verification_status,
                          c.verification_notes,
                          u.name AS owner_name,
                          u.email AS owner_email,
                          u.verified AS owner_verified,
                          ep.company_phone,
                          ep.company_address,
                          ep.company_location,
             ep.website AS profile_website,
             ep.id_document_url,
             ep.business_certificate_url,
             ep.tax_registration_number,
             ep.authorization_letter_url,
             ep.linkedin_profile_url
                   FROM companies c
                   LEFT JOIN users u ON u.id = c.owner_user_id
                   LEFT JOIN employer_profiles ep ON ep.user_id = c.owner_user_id
                   ORDER BY c.created_at DESC`;

  const fallbackSql = `SELECT c.id, c.name, c.industry, c.location, c.website, c.logo_url, c.created_at,
                              c.owner_user_id,
                              u.name AS owner_name,
                              u.email AS owner_email,
                              u.verified AS owner_verified,
                              NULL AS company_phone,
                              NULL AS company_address,
                              NULL AS company_location,
                              NULL AS profile_website,
                              NULL AS verification_status,
                              NULL AS verification_notes
                       FROM companies c
                       LEFT JOIN users u ON u.id = c.owner_user_id
                       ORDER BY c.created_at DESC`;

  db.query(richSql, (err, rows) => {
    if (!err) return res.json(rows || []);
    if (err.code !== "ER_NO_SUCH_TABLE" && err.code !== "ER_BAD_FIELD_ERROR") {
      return res.status(500).json({ error: err.message });
    }
    db.query(fallbackSql, (fallbackErr, fallbackRows) => {
      if (fallbackErr) return res.status(500).json({ error: fallbackErr.message });
      res.json(fallbackRows || []);
    });
  });
});

router.put("/companies/:id/verify", adminAuth, (req, res) => {
  const companyId = Number(req.params.id);
  const verified = req.body && req.body.verified ? 1 : 0;
  const notesRaw = String((req.body && req.body.notes) || "").trim();
  const notes = notesRaw ? notesRaw.slice(0, 1000) : null;
  const verificationStatus = verified ? "approved" : "pending";

  if (!companyId) return res.status(400).json({ message: "Invalid company" });

  const approveWithEvidenceGuard = (done) => {
    if (!verified) return done();
    db.query(
      `SELECT ep.id_document_url, ep.business_certificate_url, ep.tax_registration_number
       FROM companies c
       LEFT JOIN employer_profiles ep ON ep.user_id = c.owner_user_id
       WHERE c.id = ?
       LIMIT 1`,
      [companyId],
      (evidenceErr, evidenceRows) => {
        if (evidenceErr) {
          if (evidenceErr.code === "ER_NO_SUCH_TABLE" || evidenceErr.code === "ER_BAD_FIELD_ERROR") {
            return res.status(400).json({
              message: "Verification evidence fields are missing in database. Please run migrations or restart to bootstrap schema."
            });
          }
          return res.status(500).json({ error: evidenceErr.message });
        }

        const evidence = evidenceRows?.[0] || {};
        const missing = [];
        if (!String(evidence.id_document_url || "").trim()) missing.push("government ID document URL");
        if (!String(evidence.business_certificate_url || "").trim()) missing.push("business certificate URL");
        if (!String(evidence.tax_registration_number || "").trim()) missing.push("tax registration number");

        if (missing.length) {
          return res.status(400).json({
            message: `Cannot verify company yet. Missing required evidence: ${missing.join(", ")}.`
          });
        }

        return done();
      }
    );
  };

  approveWithEvidenceGuard(() => {

    db.query(
      `UPDATE companies
       SET verification_status = ?, verification_notes = ?, verified_by_admin_id = ?, verified_at = ?
       WHERE id = ?`,
      [verificationStatus, notes, req.user.id, verified ? new Date() : null, companyId],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!result.affectedRows) return res.status(404).json({ message: "Company not found" });

        db.query(
          "SELECT owner_user_id FROM companies WHERE id = ? LIMIT 1",
          [companyId],
          (ownerErr, ownerRows) => {
            if (ownerErr) return res.status(500).json({ error: ownerErr.message });
            const ownerUserId = Number(ownerRows?.[0]?.owner_user_id || 0);
            if (!ownerUserId) {
              return res.json({ message: verified ? "Company verified" : "Company marked pending verification" });
            }

            db.query(
              "UPDATE users SET verified = ? WHERE id = ?",
              [verified ? 1 : 0, ownerUserId],
              (userErr) => {
                if (userErr) return res.status(500).json({ error: userErr.message });
                return res.json({
                  message: verified
                    ? "Company verified and employer approved"
                    : "Company marked pending and employer unverified"
                });
              }
            );
          }
        );
      }
    );
  });
});

router.delete("/companies/:id", adminAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid company id" });

  db.query("DELETE FROM companies WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Company not found" });
    res.json({ message: "Company deleted" });
  });
});

module.exports = router;


