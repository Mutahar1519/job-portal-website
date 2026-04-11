const db = require("../config/mysql");
const { sendMail } = require("../utils/mailer");

const isMissingColumnError = (err) => {
  return !!err && (err.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(err.message || ""));
};

/* Email employer + applicant after a successful application */
const sendApplicationEmails = async ({ userId, jobId, fullName, applicantEmail, coverLetter }) => {
  // Lookup job title and employer email in one query
  const rows = await new Promise((resolve, reject) => {
    db.query(
      `SELECT j.title AS job_title, u.email AS employer_email, u.name AS employer_name
       FROM jobs j
       JOIN users u ON j.posted_by = u.id
       WHERE j.id = ?`,
      [jobId],
      (err, result) => (err ? reject(err) : resolve(result))
    );
  });

  if (!rows.length) return;
  const { job_title, employer_email, employer_name } = rows[0];
  const candidate = fullName || "A candidate";
  const preview = coverLetter ? coverLetter.slice(0, 200) + (coverLetter.length > 200 ? "..." : "") : "";

  const employerSubject = `New application for "${job_title}"`;
  const employerText = [
    `Hi ${employer_name || "there"},`,
    ``,
    `${candidate} has applied for your "${job_title}" position.`,
    ``,
    preview ? `Cover letter excerpt:\n"${preview}"` : "",
    ``,
    `Log in to your employer dashboard to review and move the application through your pipeline.`,
    ``,
    `— JobPortal`
  ].join("\n");

  await sendMail({ to: employer_email, subject: employerSubject, text: employerText });

  if (applicantEmail) {
    const seekerSubject = `Your application to "${job_title}" was received`;
    const seekerText = [
      `Hi ${candidate},`,
      ``,
      `Your application for "${job_title}" has been submitted successfully.`,
      `The employer will review it and reach out if you're a good fit.`,
      ``,
      `You can track your application status any time from your dashboard.`,
      ``,
      `— JobPortal`
    ].join("\n");
    await sendMail({ to: applicantEmail, subject: seekerSubject, text: seekerText });
  }
};

/* CHECK IF USER HAS APPLIED FOR A JOB */
exports.checkApplicationStatus = (req, res) => {
  const userId = req.user.id;
  const jobId = req.params.id;

  if (!jobId || isNaN(jobId)) {
    return res.status(400).json({ message: "Invalid job" });
  }

  db.query(
    "SELECT id, status FROM applications WHERE user_id = ? AND job_id = ? LIMIT 1",
    [userId, jobId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length > 0) {
        res.json({ hasApplied: true, status: results[0].status });
      } else {
        res.json({ hasApplied: false });
      }
    }
  );
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

        // Fire-and-forget: email employer and applicant (does not affect response)
        sendApplicationEmails({ userId, jobId, fullName, applicantEmail: email, coverLetter }).catch(err => {
          console.error("[EMAIL] Failed to send application emails:", err.message);
        });
      }
    );
  };

  db.query("SELECT role, is_admin FROM users WHERE id = ? LIMIT 1", [userId], (roleErr, roleRows) => {
    if (roleErr) return res.status(500).json({ message: "Database error" });
    if (!roleRows.length) return res.status(404).json({ message: "User not found" });

    const role = String(roleRows[0].role || "").toLowerCase();
    const isAdmin = Number(roleRows[0].is_admin) === 1;

    // Allow admins to apply for jobs too, while defaulting to role=job_seeker for regular users
    if (!isAdmin && role !== "job_seeker") {
      return res.status(403).json({ message: "Only job seekers and admins can apply for jobs" });
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

/* LIST USER INTERVIEWS */
exports.getMyInterviews = (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT i.id,
           i.application_id,
           i.interviewer_name,
           i.interviewer_email,
           i.scheduled_at,
           i.duration_minutes,
           i.timezone,
           i.location,
           i.meeting_link,
           i.notes,
           i.status,
           i.created_at,
           j.id AS job_id,
           j.title AS job_title,
           j.location AS job_location,
           a.pipeline_stage,
           a.status AS application_status
    FROM interviews_scheduled i
    JOIN applications a ON a.id = i.application_id
    JOIN jobs j ON j.id = a.job_id
    WHERE a.user_id = ?
    ORDER BY i.scheduled_at ASC, i.created_at DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        return res.json([]);
      }
      return res.status(500).json({ message: "Failed to load interviews" });
    }
    res.json(rows || []);
  });
};

/* LIST USER BACKGROUND CHECKS */
exports.getMyBackgroundChecks = (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT bc.id,
           bc.application_id,
           bc.provider,
           bc.status,
           bc.result,
           bc.notes,
           bc.created_at,
           bc.updated_at,
           j.id AS job_id,
           j.title AS job_title,
           a.pipeline_stage,
           a.status AS application_status
    FROM background_checks bc
    JOIN applications a ON a.id = bc.application_id
    JOIN jobs j ON j.id = a.job_id
    WHERE a.user_id = ?
    ORDER BY bc.created_at DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        return res.json([]);
      }
      return res.status(500).json({ message: "Failed to load background checks" });
    }
    res.json(rows || []);
  });
};

/* DOWNLOAD ICS FOR A USER INTERVIEW */
exports.downloadMyInterviewIcs = (req, res) => {
  const userId = req.user.id;
  const interviewId = Number(req.params.id);
  if (!interviewId) return res.status(400).json({ message: "Invalid interview id" });

  const sql = `
    SELECT i.id,
           i.scheduled_at,
           i.duration_minutes,
           i.timezone,
           i.location,
           i.meeting_link,
           i.notes,
           j.title AS job_title
    FROM interviews_scheduled i
    JOIN applications a ON a.id = i.application_id
    JOIN jobs j ON j.id = a.job_id
    WHERE i.id = ? AND a.user_id = ?
    LIMIT 1
  `;

  db.query(sql, [interviewId, userId], (err, rows) => {
    if (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        return res.status(404).json({ message: "Interview scheduling is not available" });
      }
      return res.status(500).json({ message: "Failed to generate interview calendar file" });
    }

    if (!rows.length) return res.status(404).json({ message: "Interview not found" });

    const row = rows[0];
    const start = new Date(row.scheduled_at);
    const durationMinutes = Number(row.duration_minutes || 30);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const asIcsDate = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const uid = `interview-${row.id}@jobportal.local`;
    const summary = `Interview: ${row.job_title || "Job Interview"}`;
    const description = [row.notes || "", row.meeting_link ? `Meeting link: ${row.meeting_link}` : ""]
      .filter(Boolean)
      .join("\\n");

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//JobPortal//Interview Scheduler//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${asIcsDate(new Date())}`,
      `DTSTART:${asIcsDate(start)}`,
      `DTEND:${asIcsDate(end)}`,
      `SUMMARY:${summary}`,
      `LOCATION:${row.location || "Online"}`,
      `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=interview-${row.id}.ics`);
    return res.status(200).send(ics);
  });
};
