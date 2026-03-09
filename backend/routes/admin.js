const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const db = require("../config/mysql");
const { notifyShiftAlerts } = require("../utils/shiftAlerts");
const { getPlatformSetting, setPlatformSetting, toBooleanSetting } = require("../utils/platformSettings");

const DEFAULT_AUTO_APPROVAL_ENABLED = process.env.AUTO_APPROVE_JOBS !== "false";

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
  db.query("SELECT id, name, email, verified, is_admin FROM users", (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(users);
  });
});

// GET all jobs (admin)
router.get("/jobs", adminAuth, (req, res) => {
  db.query("SELECT * FROM jobs ORDER BY is_premium DESC, created_at DESC", (err, jobs) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(jobs);
  });
});

// ADD job (admin)
router.post("/jobs", adminAuth, (req, res) => {
  const { title, location, job_type, category, description, is_premium } = req.body;

  if (!title || !location || !job_type || !category || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.query(
    "INSERT INTO jobs (title, location, job_type, category, description, is_premium, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [title, location, job_type, category, description, is_premium ? 1 : 0, 1],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Job created", id: result.insertId });
    }
  );
});

// UPDATE job (admin)
router.put("/jobs/:id", adminAuth, (req, res) => {
  const { title, location, job_type, category, description, is_premium } = req.body;

  if (!title || !location || !job_type || !category || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.query(
    "UPDATE jobs SET title = ?, location = ?, job_type = ?, category = ?, description = ?, is_premium = ? WHERE id = ?",
    [title, location, job_type, category, description, is_premium ? 1 : 0, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Job not found" });
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
    "UPDATE jobs SET is_approved = 1 WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Job not found" });
      res.json({ message: "Job approved" });
    }
  );
});

// DELETE job
router.delete("/jobs/:id", adminAuth, (req, res) => {
  db.query(
    "DELETE FROM jobs WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Job not found" });
      res.json({ message: "Job deleted" });
    }
  );
});

// VIEW applications per job (admin)
router.get("/jobs/:id/applications", adminAuth, (req, res) => {
  const sql = `
    SELECT a.id, a.status, a.cover_letter, a.cv_path, a.created_at,
           a.full_name, a.email, a.phone, a.country,
           u.id AS user_id, u.name AS user_name, u.email AS user_email
    FROM applications a
    JOIN users u ON a.user_id = u.id
    WHERE a.job_id = ?
    ORDER BY a.created_at DESC
  `;

  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
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
  const status = req.query.status || "pending";
  const approved = status === "approved" ? 1 : 0;

  db.query(
    "SELECT id, name, role, email, rating, message, approved, created_at FROM reviews WHERE approved = ? ORDER BY created_at DESC",
    [approved],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.put("/reviews/:id/approve", adminAuth, (req, res) => {
  db.query(
    "UPDATE reviews SET approved = 1 WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Review not found" });
      res.json({ message: "Review approved" });
    }
  );
});

router.delete("/reviews/:id", adminAuth, (req, res) => {
  db.query(
    "DELETE FROM reviews WHERE id = ?",
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

module.exports = router;


