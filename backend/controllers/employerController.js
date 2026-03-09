const db = require("../config/mysql");

const allowedStages = ["new", "screening", "interview", "offer", "hired", "rejected"];

exports.getMyJobs = (req, res) => {
  const sql = `
    SELECT j.*, c.name AS company_name, c.logo_url AS company_logo
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    WHERE j.posted_by = ?
    ORDER BY j.created_at DESC
  `;

  db.query(sql, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.getJobApplications = (req, res) => {
  const jobId = Number(req.query.jobId);
  if (!jobId) return res.status(400).json({ message: "jobId is required" });

  db.query(
    "SELECT id FROM jobs WHERE id = ? AND posted_by = ?",
    [jobId, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return res.status(403).json({ message: "Not authorized" });

      const sql = `
        SELECT a.id, a.status, a.pipeline_stage, a.cover_letter, a.cv_path, a.created_at,
               a.full_name, a.email, a.phone, a.country,
               u.id AS user_id, u.name AS user_name, u.email AS user_email,
               j.id AS job_id, j.title AS job_title, j.is_shift, j.shift_status,
               j.shift_start, j.shift_end, j.shift_pay_cents, j.shift_currency,
               e.id AS escrow_id, e.status AS escrow_status, e.client_confirmed, e.worker_confirmed,
               e.release_at, e.released_at
        FROM applications a
        JOIN users u ON a.user_id = u.id
        JOIN jobs j ON a.job_id = j.id
        LEFT JOIN shift_escrows e ON e.application_id = a.id
        WHERE a.job_id = ?
        ORDER BY a.created_at DESC
      `;

      db.query(sql, [jobId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      });
    }
  );
};

exports.updatePipelineStage = (req, res) => {
  const applicationId = Number(req.params.id);
  const stage = (req.body.pipeline_stage || "").trim();

  if (!applicationId) return res.status(400).json({ message: "Invalid application" });
  if (!allowedStages.includes(stage)) {
    return res.status(400).json({ message: "Invalid pipeline stage" });
  }

  const sql = `
    SELECT a.id
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.id = ? AND j.posted_by = ?
  `;

  db.query(sql, [applicationId, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(403).json({ message: "Not authorized" });

    db.query(
      "UPDATE applications SET pipeline_stage = ? WHERE id = ?",
      [stage, applicationId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Pipeline stage updated" });
      }
    );
  });
};

exports.getEmployerStats = (req, res) => {
  const userId = req.user.id;
  const stats = {};

  db.query(
    "SELECT COUNT(*) AS total FROM jobs WHERE posted_by = ?",
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.totalJobs = rows[0].total;

      db.query(
        `SELECT COUNT(*) AS total
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE j.posted_by = ?`,
        [userId],
        (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });
          stats.totalApplications = rows[0].total;

          db.query(
            `SELECT a.pipeline_stage AS stage, COUNT(*) AS count
             FROM applications a
             JOIN jobs j ON a.job_id = j.id
             WHERE j.posted_by = ?
             GROUP BY a.pipeline_stage`,
            [userId],
            (err, rows) => {
              if (err) return res.status(500).json({ error: err.message });
              stats.pipeline = rows;

              db.query(
                `SELECT COUNT(*) AS total
                 FROM saved_jobs sj
                 JOIN jobs j ON sj.job_id = j.id
                 WHERE j.posted_by = ?`,
                [userId],
                (err, rows) => {
                  if (err) return res.status(500).json({ error: err.message });
                  stats.totalSaves = rows[0].total;
                  res.json(stats);
                }
              );
            }
          );
        }
      );
    }
  );
};
