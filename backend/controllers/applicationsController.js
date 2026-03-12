const db = require("../config/mysql");

const isMissingColumnError = (err) => {
  return !!err && (err.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(err.message || ""));
};

/* APPLY FOR A JOB */
exports.applyJob = (req, res) => {
  const userId = req.user.id;
  const jobId = req.params.id;
  const coverLetter = (req.body.cover_letter || "").trim();
  const fullName = (req.body.full_name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const phone = (req.body.phone || "").trim();
  const country = (req.body.country || "").trim();
  const cvPath = req.file ? `/uploads/cv/${req.file.filename}` : null;

  const isEmail = (value) => {
    return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  // Validate inputs
  if (!jobId || isNaN(jobId)) {
    return res.status(400).json({ message: "Invalid job" });
  }

  if (!coverLetter) {
    return res.status(400).json({ message: "Cover letter required" });
  }

  if (fullName && fullName.length > 200) {
    return res.status(400).json({ message: "Full name is too long" });
  }

  if (!isEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (phone && phone.length > 50) {
    return res.status(400).json({ message: "Phone is too long" });
  }

  if (country && country.length > 100) {
    return res.status(400).json({ message: "Country is too long" });
  }

  const runJobLookup = (includeDeadlineColumn, callback) => {
    const sql = includeDeadlineColumn
      ? "SELECT id, is_approved, application_deadline FROM jobs WHERE id = ?"
      : "SELECT id, is_approved, NULL AS application_deadline FROM jobs WHERE id = ?";
    db.query(sql, [jobId], callback);
  };

  const handleJobLookupResults = (results) => {
    if (results.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    const job = results[0];
    if (!job.is_approved) {
      return res.status(400).json({ message: "This job is not open for applications yet" });
    }

    if (job.application_deadline && new Date(job.application_deadline) < new Date()) {
      return res.status(400).json({ message: "Application deadline has passed" });
    }

    const sql = `
      INSERT INTO applications
        (user_id, job_id, full_name, email, phone, country, cover_letter, cv_path, status, pipeline_stage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        userId,
        jobId,
        fullName || null,
        email || null,
        phone || null,
        country || null,
        coverLetter,
        cvPath,
        "pending",
        "new"
      ],
      (insertErr) => {
        if (insertErr) {
          if (insertErr.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "You have already applied for this job" });
          }
          console.error(insertErr);
          return res.status(500).json({ message: "Failed to submit application" });
        }

        res.status(201).json({ message: "Application submitted successfully" });
      }
    );
  };

  db.query("SELECT role, is_admin FROM users WHERE id = ? LIMIT 1", [userId], (roleErr, roleRows) => {
    if (roleErr) return res.status(500).json({ message: "Database error" });
    if (!roleRows.length) return res.status(404).json({ message: "User not found" });

    const role = String(roleRows[0].role || "").toLowerCase();
    if (role !== "job_seeker" || Number(roleRows[0].is_admin) === 1) {
      return res.status(403).json({ message: "Only job seekers can apply for jobs" });
    }

    // Check if job exists
    runJobLookup(true, (err, results) => {
      if (err && isMissingColumnError(err)) {
        return runJobLookup(false, (fallbackErr, fallbackResults) => {
          if (fallbackErr) {
            return res.status(500).json({ message: "Database error" });
          }
          handleJobLookupResults(fallbackResults);
        });
      }

      if (err) {
        return res.status(500).json({ message: "Database error" });
      }

      handleJobLookupResults(results);
    });
  });
};

/* LIST USER APPLICATIONS */
exports.getMyApplications = (req, res) => {
  const userId = req.user.id;

  const buildSql = (includeDeadlineColumn) => `
    SELECT a.id, a.status, a.pipeline_stage, a.cover_letter, a.cv_path, a.created_at,
           j.id AS job_id, j.title, j.location, j.job_type, j.is_shift, j.shift_status,
        j.shift_start, j.shift_end, j.shift_pay_cents, j.shift_currency,
        ${includeDeadlineColumn ? "j.application_deadline" : "NULL AS application_deadline"},
        ${includeDeadlineColumn ? "(CASE WHEN j.application_deadline IS NULL OR j.application_deadline >= NOW() THEN 1 ELSE 0 END)" : "1"} AS is_open_for_applications,
           e.id AS escrow_id, e.status AS escrow_status, e.client_confirmed, e.worker_confirmed,
           e.release_at, e.released_at
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    LEFT JOIN shift_escrows e ON e.application_id = a.id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `;

  db.query(buildSql(true), [userId], (err, results) => {
    if (err && isMissingColumnError(err)) {
      return db.query(buildSql(false), [userId], (fallbackErr, fallbackResults) => {
        if (fallbackErr) {
          console.error(fallbackErr);
          return res.status(500).json({ message: "Failed to load applications" });
        }
        res.json(fallbackResults);
      });
    }

    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to load applications" });
    }
    res.json(results);
  });
};

/* LIST ALL APPLICATIONS (ADMIN) */
exports.getAdminApplications = (req, res) => {
  const sql = `
    SELECT a.id, a.status, a.pipeline_stage, a.cover_letter, a.cv_path, a.created_at,
           a.full_name, a.email, a.phone, a.country,
           u.id AS user_id, u.name AS user_name, u.email AS user_email,
           j.id AS job_id, j.title AS job_title
    FROM applications a
    JOIN users u ON a.user_id = u.id
    JOIN jobs j ON a.job_id = j.id
    ORDER BY a.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to load applications" });
    }
    res.json(results);
  });
};

/* UPDATE APPLICATION STATUS (ADMIN) */
exports.updateApplicationStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["pending", "reviewed", "accepted", "rejected"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  db.query(
    "UPDATE applications SET status = ? WHERE id = ?",
    [status, id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to update status" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Application not found" });
      }

      res.json({ message: "Status updated" });
    }
  );
};
