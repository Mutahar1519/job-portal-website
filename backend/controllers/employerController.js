const db = require("../config/mysql");

const allowedStages = ["new", "screening", "interview", "offer", "hired", "rejected"];
const allowedInterviewStatuses = ["not_started", "scheduled", "completed", "offered", "rejected"];

const isMissingColumnError = (err) => {
  return !!err && (err.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(err.message || ""));
};

const normalizeBulkJobRow = (row = {}) => {
  const title = String(row.title || "").trim().slice(0, 200);
  const location = String(row.location || "").trim().slice(0, 200);
  const jobType = String(row.job_type || row.jobType || "").trim().slice(0, 100);
  const requestedCategory = String(row.category || "").trim().slice(0, 100);
  const categoryCustom = String(row.category_custom || row.categoryCustom || "").trim().slice(0, 100);
  const category = requestedCategory.toLowerCase() === "other" ? categoryCustom : requestedCategory;
  const description = String(row.description || "").trim().slice(0, 5000);
  const salaryMinRaw = row.salary_min ?? row.salaryMin;
  const salaryMaxRaw = row.salary_max ?? row.salaryMax;
  const experienceLevel = String(row.experience_level || row.experienceLevel || "").trim().slice(0, 50);
  const benefits = String(row.benefits || "").trim().slice(0, 2000);
  const isRemote = String(row.is_remote ?? row.isRemote ?? "").trim().toLowerCase();
  const applicationDeadlineRaw = String(row.application_deadline || row.applicationDeadline || "").trim();

  const parsedSalaryMin = salaryMinRaw === "" || salaryMinRaw == null ? null : Number(salaryMinRaw);
  const parsedSalaryMax = salaryMaxRaw === "" || salaryMaxRaw == null ? null : Number(salaryMaxRaw);
  const applicationDeadline = applicationDeadlineRaw ? new Date(applicationDeadlineRaw) : null;

  return {
    title,
    location,
    job_type: jobType,
    category,
    description,
    salary_min: Number.isFinite(parsedSalaryMin) ? Math.max(0, parsedSalaryMin) : null,
    salary_max: Number.isFinite(parsedSalaryMax) ? Math.max(0, parsedSalaryMax) : null,
    experience_level: experienceLevel || null,
    is_remote: ["1", "true", "yes", "remote"].includes(isRemote) ? 1 : 0,
    benefits: benefits || null,
    application_deadline: applicationDeadline && !Number.isNaN(applicationDeadline.valueOf()) ? applicationDeadline : null,
    _raw_deadline: applicationDeadlineRaw
  };
};

const validateBulkJobRow = (job) => {
  const errors = [];
  if (!job.title) errors.push("title is required");
  if (!job.location) errors.push("location is required");
  if (!job.job_type) errors.push("job_type is required");
  if (!job.category) errors.push("category is required");
  if (!job.description) errors.push("description is required");
  if (job.description && job.description.length < 20) errors.push("description must be at least 20 characters");
  if (job.salary_min != null && job.salary_max != null && job.salary_min > job.salary_max) {
    errors.push("salary_min cannot be greater than salary_max");
  }
  if (job._raw_deadline && !job.application_deadline) {
    errors.push("application_deadline is invalid");
  }
  return errors;
};

exports.getMyJobs = (req, res) => {
  const filter = String(req.query.status || "").trim().toLowerCase();
  const withExpirySql = `
    SELECT j.*, c.name AS company_name, c.logo_url AS company_logo,
           j.expires_at, j.renewal_count, j.last_renewed_at
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    WHERE j.posted_by = ?
    ORDER BY j.created_at DESC
  `;
  const fallbackSql = `
    SELECT j.*, c.name AS company_name, c.logo_url AS company_logo,
           DATE_ADD(j.created_at, INTERVAL 30 DAY) AS expires_at,
           0 AS renewal_count,
           NULL AS last_renewed_at
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    WHERE j.posted_by = ?
    ORDER BY j.created_at DESC
  `;

  const applyFilter = (rows) => {
    if (filter !== "expiring_soon") return rows;
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return (rows || []).filter((job) => {
      if (!job.expires_at) return false;
      const exp = new Date(job.expires_at).getTime();
      if (!Number.isFinite(exp)) return false;
      return exp >= now && exp - now <= sevenDaysMs;
    });
  };

  db.query(withExpirySql, [req.user.id], (err, rows) => {
    if (err) {
      if (!isMissingColumnError(err)) return res.status(500).json({ error: err.message });
      return db.query(fallbackSql, [req.user.id], (fallbackErr, fallbackRows) => {
        if (fallbackErr) return res.status(500).json({ error: fallbackErr.message });
        return res.json(applyFilter(fallbackRows));
      });
    }
    return res.json(applyFilter(rows));
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

      const sqlWithEvaluation = `
        SELECT a.id, a.status, a.pipeline_stage, a.cover_letter, a.cv_path, a.created_at,
               a.full_name, a.email, a.phone, a.country,
               a.score, a.interview_status, a.interview_notes,
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

      const sqlFallback = `
        SELECT a.id, a.status, a.pipeline_stage, a.cover_letter, a.cv_path, a.created_at,
               a.full_name, a.email, a.phone, a.country,
               NULL AS score, 'not_started' AS interview_status, NULL AS interview_notes,
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

      db.query(sqlWithEvaluation, [jobId], (err, rows) => {
        if (err) {
          if (!isMissingColumnError(err)) return res.status(500).json({ error: err.message });
          return db.query(sqlFallback, [jobId], (fallbackErr, fallbackRows) => {
            if (fallbackErr) return res.status(500).json({ error: fallbackErr.message });
            return res.json(fallbackRows);
          });
        }
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

exports.updateApplicationEvaluation = (req, res) => {
  const applicationId = Number(req.params.id);
  const scoreRaw = req.body.score;
  const interviewStatusRaw = String(req.body.interview_status || "").trim().toLowerCase();
  const interviewNotesRaw = String(req.body.interview_notes || "").trim();

  if (!applicationId) return res.status(400).json({ message: "Invalid application" });

  const score = scoreRaw === "" || scoreRaw == null ? null : Number(scoreRaw);
  if (score != null && (!Number.isFinite(score) || score < 0 || score > 100)) {
    return res.status(400).json({ message: "Score must be a number between 0 and 100" });
  }

  const interviewStatus = interviewStatusRaw || "not_started";
  if (!allowedInterviewStatuses.includes(interviewStatus)) {
    return res.status(400).json({ message: "Invalid interview status" });
  }

  if (interviewNotesRaw.length > 2000) {
    return res.status(400).json({ message: "Interview notes are too long" });
  }

  const authSql = `
    SELECT a.id
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.id = ? AND j.posted_by = ?
  `;

  db.query(authSql, [applicationId, req.user.id], (authErr, rows) => {
    if (authErr) return res.status(500).json({ error: authErr.message });
    if (!rows.length) return res.status(403).json({ message: "Not authorized" });

    db.query(
      `UPDATE applications
       SET score = ?, interview_status = ?, interview_notes = ?
       WHERE id = ?`,
      [score, interviewStatus, interviewNotesRaw || null, applicationId],
      (updateErr) => {
        if (updateErr) {
          if (isMissingColumnError(updateErr)) {
            return res.status(409).json({
              message: "Application evaluation fields are missing in database. Run backend/sql/applications.sql migration."
            });
          }
          return res.status(500).json({ error: updateErr.message });
        }

        return res.json({ message: "Candidate evaluation updated" });
      }
    );
  });
};

exports.renewJob = (req, res) => {
  const jobId = Number(req.params.id);
  if (!jobId) return res.status(400).json({ message: "Invalid job" });

  db.query(
    "SELECT id FROM jobs WHERE id = ? AND posted_by = ?",
    [jobId, req.user.id],
    (authErr, rows) => {
      if (authErr) return res.status(500).json({ error: authErr.message });
      if (!rows.length) return res.status(403).json({ message: "Not authorized" });

      const renewSql = `
        UPDATE jobs
        SET expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
            renewal_count = COALESCE(renewal_count, 0) + 1,
            last_renewed_at = NOW(),
            is_approved = 1,
            moderation_status = 'approved'
        WHERE id = ?
      `;

      db.query(renewSql, [jobId], (renewErr) => {
        if (renewErr) {
          if (isMissingColumnError(renewErr)) {
            return res.status(409).json({
              message: "Job expiration fields are missing in database. Run backend/sql/job-expiration.sql migration."
            });
          }
          return res.status(500).json({ error: renewErr.message });
        }

        return res.json({ message: "Job renewed for 30 days" });
      });
    }
  );
};

exports.bulkUploadJobs = (req, res) => {
  const rows = Array.isArray(req.body.jobs) ? req.body.jobs : [];
  const dryRun = Boolean(req.body.dry_run);

  if (!rows.length) {
    return res.status(400).json({ message: "jobs array is required" });
  }

  if (rows.length > 250) {
    return res.status(400).json({ message: "Maximum 250 jobs per upload" });
  }

  const prepared = rows.map((row, index) => {
    const normalized = normalizeBulkJobRow(row || {});
    const errors = validateBulkJobRow(normalized);
    return { rowIndex: index + 1, normalized, errors };
  });

  const invalidRows = prepared
    .filter((item) => item.errors.length)
    .map((item) => ({ row: item.rowIndex, errors: item.errors }));

  const validRows = prepared.filter((item) => !item.errors.length);

  if (dryRun) {
    return res.json({
      dry_run: true,
      total_rows: rows.length,
      valid_rows: validRows.length,
      invalid_rows: invalidRows
    });
  }

  if (!validRows.length) {
    return res.status(400).json({
      message: "No valid jobs to create",
      total_rows: rows.length,
      valid_rows: 0,
      invalid_rows: invalidRows
    });
  }

  db.query("SELECT id FROM companies WHERE owner_user_id = ? LIMIT 1", [req.user.id], (companyErr, companyRows) => {
    if (companyErr) return res.status(500).json({ error: companyErr.message });
    const companyId = companyRows.length ? companyRows[0].id : null;

    const createdIds = [];
    const createErrors = [];

    const insertWithSalarySql = `
      INSERT INTO jobs
      (title, location, job_type, category, description, is_premium, posted_by, company_id, is_approved,
       application_deadline, moderation_status, moderation_score, moderation_reason, auto_approved_at,
       salary_min, salary_max, experience_level, is_remote, benefits)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0, ?, 'pending_manual_review', 0, 'bulk upload pending review', NULL, ?, ?, ?, ?, ?)
    `;

    const insertFallbackSql = `
      INSERT INTO jobs
      (title, location, job_type, category, description, is_premium, posted_by, company_id, is_approved,
       application_deadline, moderation_status, moderation_score, moderation_reason, auto_approved_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0, ?, 'pending_manual_review', 0, 'bulk upload pending review', NULL)
    `;

    const insertNext = (index, useSalaryColumns = true) => {
      if (index >= validRows.length) {
        return res.status(201).json({
          dry_run: false,
          total_rows: rows.length,
          created_count: createdIds.length,
          created_job_ids: createdIds,
          skipped_invalid_rows: invalidRows,
          create_errors: createErrors
        });
      }

      const row = validRows[index];
      const j = row.normalized;

      const sql = useSalaryColumns ? insertWithSalarySql : insertFallbackSql;
      const params = useSalaryColumns
        ? [
            j.title,
            j.location,
            j.job_type,
            j.category,
            j.description,
            req.user.id,
            companyId,
            j.application_deadline,
            j.salary_min,
            j.salary_max,
            j.experience_level,
            j.is_remote,
            j.benefits
          ]
        : [
            j.title,
            j.location,
            j.job_type,
            j.category,
            j.description,
            req.user.id,
            companyId,
            j.application_deadline
          ];

      db.query(sql, params, (insertErr, result) => {
        if (insertErr) {
          if (useSalaryColumns && isMissingColumnError(insertErr)) {
            return insertNext(index, false);
          }

          createErrors.push({ row: row.rowIndex, error: insertErr.message });
          return insertNext(index + 1, useSalaryColumns);
        }

        createdIds.push(result.insertId);
        return insertNext(index + 1, useSalaryColumns);
      });
    };

    insertNext(0, true);
  });
};

exports.scheduleInterview = (req, res) => {
  const applicationId = Number(req.params.id);
  const scheduledAtRaw = String(req.body.scheduled_at || "").trim();
  const durationMinutes = Number(req.body.duration_minutes || 30);
  const meetingType = String(req.body.meeting_type || "video").trim().toLowerCase();
  const meetingLink = String(req.body.meeting_link || "").trim().slice(0, 500);
  const notes = String(req.body.notes || "").trim().slice(0, 2000);

  if (!applicationId) return res.status(400).json({ message: "Invalid application" });

  const scheduledAt = new Date(scheduledAtRaw);
  if (!scheduledAtRaw || Number.isNaN(scheduledAt.valueOf())) {
    return res.status(400).json({ message: "scheduled_at is required and must be a valid datetime" });
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
    return res.status(400).json({ message: "duration_minutes must be between 15 and 240" });
  }

  if (!["video", "phone", "onsite"].includes(meetingType)) {
    return res.status(400).json({ message: "meeting_type must be video, phone, or onsite" });
  }

  const authSql = `
    SELECT a.id AS application_id, a.user_id AS candidate_user_id, a.job_id,
           j.posted_by AS employer_user_id, j.title AS job_title
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.id = ? AND j.posted_by = ?
    LIMIT 1
  `;

  db.query(authSql, [applicationId, req.user.id], (authErr, rows) => {
    if (authErr) return res.status(500).json({ error: authErr.message });
    if (!rows.length) return res.status(403).json({ message: "Not authorized" });

    const app = rows[0];
    const insertSql = `
      INSERT INTO interviews_scheduled
      (application_id, job_id, employer_user_id, candidate_user_id, scheduled_at,
       duration_minutes, meeting_type, meeting_link, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
    `;

    db.query(
      insertSql,
      [
        applicationId,
        app.job_id,
        req.user.id,
        app.candidate_user_id,
        scheduledAt,
        durationMinutes,
        meetingType,
        meetingLink || null,
        notes || null
      ],
      (insertErr, result) => {
        if (insertErr) {
          if (isMissingColumnError(insertErr) || insertErr.code === "ER_NO_SUCH_TABLE") {
            return res.status(409).json({
              message: "Interview scheduling tables are missing. Run backend/sql/interview-scheduling.sql migration."
            });
          }
          return res.status(500).json({ error: insertErr.message });
        }

        db.query(
          "UPDATE applications SET interview_status = 'scheduled' WHERE id = ?",
          [applicationId],
          () => {
            return res.status(201).json({
              message: "Interview scheduled",
              interview_id: result.insertId
            });
          }
        );
      }
    );
  });
};

exports.getApplicationInterviews = (req, res) => {
  const applicationId = Number(req.params.id);
  if (!applicationId) return res.status(400).json({ message: "Invalid application" });

  const authSql = `
    SELECT a.id
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.id = ? AND j.posted_by = ?
    LIMIT 1
  `;

  db.query(authSql, [applicationId, req.user.id], (authErr, authRows) => {
    if (authErr) return res.status(500).json({ error: authErr.message });
    if (!authRows.length) return res.status(403).json({ message: "Not authorized" });

    db.query(
      `SELECT id, scheduled_at, duration_minutes, meeting_type, meeting_link, notes, status, created_at
       FROM interviews_scheduled
       WHERE application_id = ?
       ORDER BY scheduled_at DESC`,
      [applicationId],
      (err, rows) => {
        if (err) {
          if (err.code === "ER_NO_SUCH_TABLE") {
            return res.status(409).json({
              message: "Interview scheduling tables are missing. Run backend/sql/interview-scheduling.sql migration."
            });
          }
          return res.status(500).json({ error: err.message });
        }
        return res.json(rows || []);
      }
    );
  });
};

exports.updateInterviewStatus = (req, res) => {
  const interviewId = Number(req.params.id);
  const status = String(req.body.status || "").trim().toLowerCase();
  if (!interviewId) return res.status(400).json({ message: "Invalid interview" });
  if (!["scheduled", "completed", "cancelled", "no_show"].includes(status)) {
    return res.status(400).json({ message: "Invalid interview status" });
  }

  const authSql = `
    SELECT i.id, i.application_id
    FROM interviews_scheduled i
    JOIN applications a ON a.id = i.application_id
    JOIN jobs j ON j.id = a.job_id
    WHERE i.id = ? AND j.posted_by = ?
    LIMIT 1
  `;

  db.query(authSql, [interviewId, req.user.id], (authErr, rows) => {
    if (authErr) {
      if (authErr.code === "ER_NO_SUCH_TABLE") {
        return res.status(409).json({
          message: "Interview scheduling tables are missing. Run backend/sql/interview-scheduling.sql migration."
        });
      }
      return res.status(500).json({ error: authErr.message });
    }
    if (!rows.length) return res.status(403).json({ message: "Not authorized" });

    db.query(
      "UPDATE interviews_scheduled SET status = ? WHERE id = ?",
      [status, interviewId],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        const mappedInterviewStatus = status === "scheduled"
          ? "scheduled"
          : status === "completed"
            ? "completed"
            : "not_started";

        db.query(
          "UPDATE applications SET interview_status = ? WHERE id = ?",
          [mappedInterviewStatus, rows[0].application_id],
          () => res.json({ message: "Interview status updated" })
        );
      }
    );
  });
};

exports.createBackgroundCheck = (req, res) => {
  const applicationId = Number(req.params.id);
  const provider = String(req.body.provider || "internal").trim().slice(0, 80);
  const packageName = String(req.body.package_name || "standard").trim().slice(0, 80);
  const notes = String(req.body.notes || "").trim().slice(0, 2000);

  if (!applicationId) return res.status(400).json({ message: "Invalid application" });

  const authSql = `
    SELECT a.id AS application_id, a.user_id AS candidate_user_id, a.job_id
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.id = ? AND j.posted_by = ?
    LIMIT 1
  `;

  db.query(authSql, [applicationId, req.user.id], (authErr, rows) => {
    if (authErr) return res.status(500).json({ error: authErr.message });
    if (!rows.length) return res.status(403).json({ message: "Not authorized" });

    const app = rows[0];
    const reference = `BG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.query(
      `INSERT INTO background_checks
       (application_id, job_id, employer_user_id, candidate_user_id, provider, package_name,
        status, reference_code, notes, ordered_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())`,
      [applicationId, app.job_id, req.user.id, app.candidate_user_id, provider, packageName, reference, notes || null],
      (insertErr, result) => {
        if (insertErr) {
          if (insertErr.code === "ER_NO_SUCH_TABLE") {
            return res.status(409).json({
              message: "Background checks table is missing. Run backend/sql/background-checks.sql migration."
            });
          }
          return res.status(500).json({ error: insertErr.message });
        }
        return res.status(201).json({
          message: "Background check ordered",
          background_check_id: result.insertId,
          reference_code: reference
        });
      }
    );
  });
};

exports.getApplicationBackgroundChecks = (req, res) => {
  const applicationId = Number(req.params.id);
  if (!applicationId) return res.status(400).json({ message: "Invalid application" });

  const authSql = `
    SELECT a.id
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.id = ? AND j.posted_by = ?
    LIMIT 1
  `;

  db.query(authSql, [applicationId, req.user.id], (authErr, authRows) => {
    if (authErr) return res.status(500).json({ error: authErr.message });
    if (!authRows.length) return res.status(403).json({ message: "Not authorized" });

    db.query(
      `SELECT id, provider, package_name, status, reference_code, notes, ordered_at, completed_at, created_at
       FROM background_checks
       WHERE application_id = ?
       ORDER BY created_at DESC`,
      [applicationId],
      (err, rows) => {
        if (err) {
          if (err.code === "ER_NO_SUCH_TABLE") {
            return res.status(409).json({
              message: "Background checks table is missing. Run backend/sql/background-checks.sql migration."
            });
          }
          return res.status(500).json({ error: err.message });
        }
        return res.json(rows || []);
      }
    );
  });
};

exports.updateBackgroundCheckStatus = (req, res) => {
  const checkId = Number(req.params.id);
  const status = String(req.body.status || "").trim().toLowerCase();
  const resultSummary = String(req.body.result_summary || "").trim().slice(0, 1000);

  if (!checkId) return res.status(400).json({ message: "Invalid background check" });
  if (!["pending", "in_progress", "clear", "consider", "failed", "cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid background check status" });
  }

  const authSql = `
    SELECT bc.id
    FROM background_checks bc
    WHERE bc.id = ? AND bc.employer_user_id = ?
    LIMIT 1
  `;

  db.query(authSql, [checkId, req.user.id], (authErr, rows) => {
    if (authErr) {
      if (authErr.code === "ER_NO_SUCH_TABLE") {
        return res.status(409).json({
          message: "Background checks table is missing. Run backend/sql/background-checks.sql migration."
        });
      }
      return res.status(500).json({ error: authErr.message });
    }
    if (!rows.length) return res.status(403).json({ message: "Not authorized" });

    db.query(
      `UPDATE background_checks
       SET status = ?,
           result_summary = ?,
           completed_at = CASE WHEN ? IN ('clear','consider','failed','cancelled') THEN NOW() ELSE completed_at END
       WHERE id = ?`,
      [status, resultSummary || null, status, checkId],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        return res.json({ message: "Background check status updated" });
      }
    );
  });
};
