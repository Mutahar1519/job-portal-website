db.query(
const db = require("../config/mysql");
const {
  canSendNotification,
  sendApplicationUpdateEmail
} = require("./notificationsController");
const { sendMail } = require("../utils/mailer");


  `CREATE TABLE IF NOT EXISTS employer_application_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employer_user_id INT NOT NULL,
    application_id INT NOT NULL,
    job_id INT NOT NULL,
    message VARCHAR(255) NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_employer_app_notifications_user (employer_user_id),
    INDEX idx_employer_app_notifications_read (employer_user_id, is_read),
    INDEX idx_employer_app_notifications_created (created_at)
  )`,
  (err) => {
    if (err) {
      console.warn("employer_application_notifications bootstrap failed:", err.message);
    }
  }
);
const isMissingColumnError = (err) => {
  return !!err && (err.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(err.message || ""));
};

<<<<<<< HEAD
const escapeIcsText = (value) => {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
};

const isDigitsOnly = (value) => /^\d+$/.test(String(value || ""));
const ALLOWED_COUNTRIES = new Set([
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "India",
  "Pakistan",
  "United Arab Emirates"
]);

const formatIcsDate = (dateValue) => {
  const d = new Date(dateValue);
  if (Number.isNaN(d.valueOf())) return "";

  const pad = (v) => String(v).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}` +
    `${pad(d.getUTCMonth() + 1)}` +
    `${pad(d.getUTCDate())}` +
    "T" +
    `${pad(d.getUTCHours())}` +
    `${pad(d.getUTCMinutes())}` +
    `${pad(d.getUTCSeconds())}` +
    "Z"
  );
};

const buildInterviewIcs = (interview) => {
  const startAt = new Date(interview.scheduled_at);
  const durationMinutes = Number(interview.duration_minutes || 30);
  const endAt = new Date(startAt.getTime() + Math.max(15, durationMinutes) * 60 * 1000);
  const nowStamp = formatIcsDate(new Date());
  const startStamp = formatIcsDate(startAt);
  const endStamp = formatIcsDate(endAt);
  const uid = `interview-${interview.id}@jobportal.local`;
  const summary = escapeIcsText(`Interview - ${interview.job_title || "Job Opportunity"}`);
  const descriptionParts = [
    `Employer: ${interview.employer_name || "Unknown"}`,
    `Meeting type: ${interview.meeting_type || "video"}`,
    interview.meeting_link ? `Meeting link: ${interview.meeting_link}` : "",
    interview.notes ? `Notes: ${interview.notes}` : ""
  ].filter(Boolean);
  const description = escapeIcsText(descriptionParts.join("\n"));
  const location = escapeIcsText(
    interview.meeting_type === "onsite"
      ? interview.job_location || "Onsite"
      : interview.meeting_link || "Online"
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JobPortal//Interview Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${startStamp}`,
    `DTEND:${endStamp}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
};

=======
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

>>>>>>> 46123c6f49ef56229259ec1006b560ffd663fbb0
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

  if (phone && !isDigitsOnly(phone)) {
    return res.status(400).json({ message: "Phone must contain only digits" });
  }

  if (country && country.length > 100) {
    return res.status(400).json({ message: "Country is too long" });
  }

  if (country && !ALLOWED_COUNTRIES.has(country)) {
    return res.status(400).json({ message: "Please select a valid country from the dropdown list" });
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
      (insertErr, insertResult) => {
        if (insertErr) {
          if (insertErr.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "You have already applied for this job" });
          }
          console.error(insertErr);
          return res.status(500).json({ message: "Failed to submit application" });
        }

        const applicationId = insertResult && insertResult.insertId ? Number(insertResult.insertId) : null;

        db.query(
          `SELECT j.title AS job_title, j.id AS job_id, j.posted_by AS employer_user_id,
                  u.email AS employer_email, u.name AS employer_name
           FROM jobs j
           LEFT JOIN users u ON u.id = j.posted_by
           WHERE j.id = ?
           LIMIT 1`,
          [jobId],
          (notifyLookupErr, notifyRows) => {
            if (!notifyLookupErr && notifyRows && notifyRows.length) {
              const employer = notifyRows[0];
              if (employer.employer_user_id && employer.employer_email) {
                canSendNotification(employer.employer_user_id, "application_status_update", (prefErr, enabled) => {
                  if (prefErr || !enabled) return;
                  const applicationsUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/employer.html`;
                  sendApplicationUpdateEmail(
                    employer.employer_user_id,
                    employer.employer_email,
                    employer.job_title || "your job",
                    applicationsUrl,
                    "new_application"
                  ).catch((mailErr) => {
                    console.warn("[applications] employer application email failed:", mailErr.message);
                  });
                });
              }

              if (employer.employer_user_id) {
                const safeTitle = String(employer.job_title || "your job").slice(0, 140);
                const inAppMessage = `New application received for ${safeTitle}`;
                if (!applicationId) return;
                db.query(
                  `INSERT INTO employer_application_notifications (employer_user_id, application_id, job_id, message)
                   VALUES (?, ?, ?, ?)`,
                  [employer.employer_user_id, applicationId, Number(jobId), inAppMessage],
                  () => {
                    // Best-effort: keep application submission successful even if notification insert fails.
                  }
                );
              }

            }
          }
        );

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
    SELECT a.id, a.status, a.pipeline_stage, a.created_at,
           COALESCE(NULLIF(TRIM(a.full_name), ''), u.name, 'Candidate') AS applicant_name,
           u.id AS user_id,
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
    const safeRows = (results || []).map((row) => ({
      ...row,
      user_ref: `U${String(row.user_id || '').padStart(6, '0')}`,
      job_ref: `J${String(row.job_id || '').padStart(6, '0')}`
    }));

    res.json(safeRows);
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

      db.query(
        `SELECT a.user_id, COALESCE(NULLIF(a.email, ''), u.email) AS recipient_email, j.title AS job_title
         FROM applications a
         JOIN users u ON u.id = a.user_id
         JOIN jobs j ON j.id = a.job_id
         WHERE a.id = ?
         LIMIT 1`,
        [id],
        (lookupErr, rows) => {
          if (lookupErr || !rows.length || !rows[0].recipient_email) return;

          const app = rows[0];
          canSendNotification(app.user_id, "application_status_update", (prefErr, enabled) => {
            if (prefErr || !enabled) return;

            const appUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;
            sendApplicationUpdateEmail(
              app.user_id,
              app.recipient_email,
              app.job_title || "your application",
              appUrl,
              status
            ).catch((mailErr) => {
              console.warn("[applications] status email send failed:", mailErr.message);
            });
          });
        }
      );

      res.json({ message: "Status updated" });
    }
  );
};

exports.getMyInterviews = (req, res) => {
  const userId = req.user.id;

  db.query(
    `SELECT i.id, i.application_id, i.job_id, i.scheduled_at, i.duration_minutes,
            i.meeting_type, i.meeting_link, i.notes, i.status, i.created_at,
            j.title AS job_title, j.location AS job_location,
            u.name AS employer_name
     FROM interviews_scheduled i
     JOIN jobs j ON j.id = i.job_id
     JOIN users u ON u.id = i.employer_user_id
     WHERE i.candidate_user_id = ?
     ORDER BY i.scheduled_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        if (err.code === "ER_NO_SUCH_TABLE") {
          return res.json([]);
        }
        return res.status(500).json({ message: "Failed to load interviews", error: err.message });
      }
      return res.json(rows || []);
    }
  );
};

exports.getMyBackgroundChecks = (req, res) => {
  const userId = req.user.id;

  db.query(
    `SELECT bc.id, bc.application_id, bc.job_id, bc.provider, bc.package_name, bc.status,
            bc.reference_code, bc.result_summary, bc.notes, bc.ordered_at, bc.completed_at, bc.created_at,
            j.title AS job_title, j.location AS job_location,
            u.name AS employer_name
     FROM background_checks bc
     JOIN jobs j ON j.id = bc.job_id
     JOIN users u ON u.id = bc.employer_user_id
     WHERE bc.candidate_user_id = ?
     ORDER BY bc.created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        if (err.code === "ER_NO_SUCH_TABLE") {
          return res.json([]);
        }
        return res.status(500).json({ message: "Failed to load background checks", error: err.message });
      }
      return res.json(rows || []);
    }
  );
};

exports.downloadMyInterviewIcs = (req, res) => {
  const userId = req.user.id;
  const interviewId = Number(req.params.id);

  if (!interviewId) {
    return res.status(400).json({ message: "Invalid interview" });
  }

  db.query(
    `SELECT i.id, i.scheduled_at, i.duration_minutes, i.meeting_type, i.meeting_link, i.notes,
            i.candidate_user_id, i.employer_user_id,
            j.title AS job_title, j.location AS job_location,
            u.name AS employer_name
     FROM interviews_scheduled i
     JOIN jobs j ON j.id = i.job_id
     JOIN users u ON u.id = i.employer_user_id
     WHERE i.id = ?
       AND (i.candidate_user_id = ? OR i.employer_user_id = ?)
     LIMIT 1`,
    [interviewId, userId, userId],
    (err, rows) => {
      if (err) {
        if (err.code === "ER_NO_SUCH_TABLE") {
          return res.status(409).json({ message: "Interview scheduling table not found. Run backend/sql/interview-scheduling.sql migration." });
        }
        return res.status(500).json({ message: "Failed to generate calendar file", error: err.message });
      }

      if (!rows.length) {
        return res.status(404).json({ message: "Interview not found" });
      }

      const interview = rows[0];
      const ics = buildInterviewIcs(interview);
      const safeFileName = `interview-${interview.id}.ics`;

      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=\"${safeFileName}\"`);
      return res.status(200).send(ics);
    }
  );
};
