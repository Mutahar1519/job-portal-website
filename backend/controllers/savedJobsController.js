const db = require("../config/mysql");

exports.saveJob = (req, res) => {
  const userId = req.user.id;
  const jobId = Number(req.params.jobId);

  if (!jobId) {
    return res.status(400).json({ message: "Invalid job" });
  }

  db.query(
    "SELECT id FROM jobs WHERE id = ? AND is_approved = 1",
    [jobId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return res.status(404).json({ message: "Job not found" });

      db.query(
        "INSERT INTO saved_jobs (user_id, job_id) VALUES (?, ?)",
        [userId, jobId],
        (err) => {
          if (err) {
            if (err.code === "ER_DUP_ENTRY") {
              return res.json({ message: "Job already saved" });
            }
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json({ message: "Job saved" });
        }
      );
    }
  );
};

exports.removeJob = (req, res) => {
  const userId = req.user.id;
  const jobId = Number(req.params.jobId);

  if (!jobId) {
    return res.status(400).json({ message: "Invalid job" });
  }

  db.query(
    "DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?",
    [userId, jobId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Saved job not found" });
      }
      res.json({ message: "Saved job removed" });
    }
  );
};

exports.listSavedJobs = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT j.*, c.name AS company_name, c.logo_url AS company_logo, sj.created_at AS saved_at
    FROM saved_jobs sj
    JOIN jobs j ON sj.job_id = j.id
    LEFT JOIN companies c ON j.company_id = c.id
    WHERE sj.user_id = ?
    ORDER BY sj.created_at DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.getSavedStatus = (req, res) => {
  const userId = req.user.id;
  const jobId = Number(req.params.jobId);

  if (!jobId) {
    return res.status(400).json({ message: "Invalid job" });
  }

  db.query(
    "SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?",
    [userId, jobId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ saved: rows.length > 0 });
    }
  );
};
