const db = require("../config/mysql");
const { notifyShiftAlerts } = require("../utils/shiftAlerts");
const { getPlatformSetting, toBooleanSetting } = require("../utils/platformSettings");

/* ===============================
   JOB MODERATION (AUTO-APPROVAL)
================================ */
const AUTO_APPROVAL_ENABLED = process.env.AUTO_APPROVE_JOBS !== "false";
const AUTO_APPROVE_MIN_SCORE = Number(process.env.AUTO_APPROVE_MIN_SCORE || 70);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const parseAiJson = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (nestedErr) {
      return null;
    }
  }
};

const evaluateJobWithOpenAI = async ({ title, description, location, jobType, category }) => {
  if (!OPENAI_API_KEY || typeof fetch !== "function") return null;

  const prompt = `You are a job moderation classifier. Determine if this job looks fake/scam.
Return strict JSON only:
{"verdict":"safe|fake|uncertain","confidence":0-100,"reason":"short reason"}

Job:
Title: ${title}
Location: ${location}
Type: ${jobType}
Category: ${category}
Description: ${description}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) return null;
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || "";
    const parsed = parseAiJson(content);
    if (!parsed) return null;

    const verdict = String(parsed.verdict || "uncertain").toLowerCase();
    const confidence = Math.max(0, Math.min(100, Number(parsed.confidence || 0)));
    const reason = String(parsed.reason || "").slice(0, 220);

    if (!["safe", "fake", "uncertain"].includes(verdict)) return null;
    return { verdict, confidence, reason };
  } catch (err) {
    return null;
  }
};

const evaluateJobModeration = async ({ title, description, location, jobType, category, autoApprovalEnabled }) => {
  const text = `${title} ${description} ${location} ${jobType} ${category}`.toLowerCase();
  const reasons = [];
  let score = 100;

  if (!description || description.length < 50) {
    score -= 35;
    reasons.push("description too short");
  }

  if (description && description.length < 120) {
    score -= 10;
    reasons.push("low detail in description");
  }

  const suspiciousRules = [
    { regex: /easy\s*money|no\s*experience\s*needed|instant\s*income/, penalty: 30, reason: "unrealistic earning claims" },
    { regex: /pay\s*fee|registration\s*fee|processing\s*fee|deposit\s*required/, penalty: 45, reason: "asks candidates for payment" },
    { regex: /click\s*link|dm\s*me|telegram|whatsapp|signal\s*me/, penalty: 25, reason: "off-platform contact pressure" },
    { regex: /crypto|bitcoin|usdt|wire\s*transfer/, penalty: 20, reason: "risky payment keywords" },
    { regex: /urgent\s*hire\s*today|limited\s*spots\s*only/, penalty: 10, reason: "high-pressure language" }
  ];

  suspiciousRules.forEach((rule) => {
    if (rule.regex.test(text)) {
      score -= rule.penalty;
      reasons.push(rule.reason);
    }
  });

  const looksLikePlaceholder = /lorem ipsum|test job|asdf|qwerty/.test(text);
  if (looksLikePlaceholder) {
    score -= 40;
    reasons.push("placeholder content detected");
  }

  if (!location || location.length < 2) {
    score -= 10;
    reasons.push("missing clear location");
  }

  if (!jobType || jobType.length < 2) {
    score -= 10;
    reasons.push("missing clear job type");
  }

  const aiAssessment = await evaluateJobWithOpenAI({ title, description, location, jobType, category });
  if (aiAssessment) {
    if (aiAssessment.verdict === "fake" && aiAssessment.confidence >= 70) {
      score -= 40;
      reasons.push(`ai flagged suspicious: ${aiAssessment.reason}`);
    }

    if (aiAssessment.verdict === "safe" && aiAssessment.confidence >= 70) {
      score += 5;
      reasons.push("ai confidence indicates likely legitimate posting");
    }
  }

  score = Math.max(0, Math.min(100, score));

  const autoApproved = autoApprovalEnabled && score >= AUTO_APPROVE_MIN_SCORE;
  const status = autoApproved ? "approved_auto" : "pending_manual_review";
  const reasonText = reasons.length ? reasons.join("; ") : "passed automatic moderation checks";

  return {
    score,
    autoApproved,
    status,
    reasonText,
    aiAssessment
  };
};

exports.getJobs = (req, res) => {
  const { location, job_type, category, keyword, company_id } = req.query;

  const buildQuery = ({ includeDeadlineColumn }) => {
    let sql = "SELECT j.*, c.name AS company_name, c.logo_url AS company_logo";
    const params = [];

    if (includeDeadlineColumn) {
      sql += ", (CASE WHEN j.application_deadline IS NULL OR j.application_deadline >= NOW() THEN 1 ELSE 0 END) AS is_open_for_applications";
    } else {
      sql += ", 1 AS is_open_for_applications";
    }

    if (req.user) {
      sql += ", (sj.id IS NOT NULL) AS is_saved";
    }

    sql += " FROM jobs j";
    sql += " LEFT JOIN companies c ON j.company_id = c.id";

    if (req.user) {
      sql += " LEFT JOIN saved_jobs sj ON sj.job_id = j.id AND sj.user_id = ?";
      params.push(req.user.id);
    }

    // show approved jobs plus any job owned by the current user (so they can see pending posts)
    sql += " WHERE (j.is_approved = 1";
    if (req.user) {
      sql += " OR j.posted_by = ?";
      params.push(req.user.id);
    }
    sql += ")";
    if (includeDeadlineColumn) {
      sql += " AND (j.application_deadline IS NULL OR j.application_deadline >= NOW())";
    }

    if (location) {
      sql += " AND j.location = ?";
      params.push(location);
    }

    if (job_type) {
      sql += " AND j.job_type = ?";
      params.push(job_type);
    }

    if (category) {
      sql += " AND j.category = ?";
      params.push(category);
    }

    if (company_id) {
      sql += " AND j.company_id = ?";
      params.push(company_id);
    }

    if (keyword) {
      sql += " AND (j.title LIKE ? OR j.description LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += " ORDER BY j.is_premium DESC, j.created_at DESC";
    return { sql, params };
  };

  const primary = buildQuery({ includeDeadlineColumn: true });
  db.query(primary.sql, primary.params, (err, results) => {
    if (!err) return res.json(results);

    const isMissingColumnError = err.code === "ER_BAD_FIELD_ERROR"
      || /Unknown column/i.test(err.message || "");

    if (!isMissingColumnError) {
      return res.status(500).json({ error: err.message });
    }

    const fallback = buildQuery({ includeDeadlineColumn: false });
    db.query(fallback.sql, fallback.params, (fallbackErr, fallbackResults) => {
      if (fallbackErr) return res.status(500).json({ error: fallbackErr.message });
      res.json(fallbackResults);
    });
  });
};

exports.getJobById = (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid job id" });

  const params = [id];
  let sql = `
    SELECT j.*, c.name AS company_name, c.logo_url AS company_logo,
           (CASE WHEN j.application_deadline IS NULL OR j.application_deadline >= NOW() THEN 1 ELSE 0 END) AS is_open_for_applications
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    WHERE j.id = ?
      AND (
        j.is_approved = 1
  `;

  if (req.user && req.user.id) {
    sql += " OR j.posted_by = ?";
    params.push(req.user.id);
  }

  sql += `
      )
    LIMIT 1
  `;

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ message: "Job not found" });
    res.json(rows[0]);
  });
};

exports.addJob = (req, res) => {
  const title = (req.body.title || "").trim();
  const location = (req.body.location || "").trim();
  const jobType = (req.body.job_type || "").trim();
  const category = (req.body.category || "").trim();
  const description = (req.body.description || "").trim();
  const isPremium = req.body.is_premium ? 1 : 0;
  const isShift = req.body.is_shift ? 1 : 0;
  const shiftStart = req.body.shift_start ? new Date(req.body.shift_start) : null;
  const shiftEnd = req.body.shift_end ? new Date(req.body.shift_end) : null;
  const shiftPayCents = req.body.shift_pay_cents ? Number(req.body.shift_pay_cents) : null;
  const shiftCurrency = (req.body.shift_currency || "usd").trim().toLowerCase();
  const applicationDeadlineRaw = (req.body.application_deadline || "").trim();
  const applicationDeadline = applicationDeadlineRaw ? new Date(applicationDeadlineRaw) : null;
  const userId = req.user ? req.user.id : null;
  const requestedCompanyId = req.body.company_id ? Number(req.body.company_id) : null;
  const bodyImageUrl = (req.body.image_url || "").trim();
  const isValidExternalUrl = bodyImageUrl && /^https?:\/\/.{4,}/.test(bodyImageUrl) && bodyImageUrl.length <= 500;
  const imageUrl = req.file
    ? "/uploads/jobs/" + req.file.filename
    : (isValidExternalUrl ? bodyImageUrl : null);

  if (!title || !location || !jobType || !category || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (title.length > 200 || location.length > 200 || jobType.length > 100 || category.length > 100) {
    return res.status(400).json({ message: "One or more fields are too long" });
  }

  if (description.length < 20 || description.length > 5000) {
    return res.status(400).json({ message: "Description must be 20-5000 characters" });
  }

  if (applicationDeadline && isNaN(applicationDeadline.valueOf())) {
    return res.status(400).json({ message: "Invalid application deadline" });
  }

  if (applicationDeadline && applicationDeadline <= new Date()) {
    return res.status(400).json({ message: "Application deadline must be in the future" });
  }

  if (isShift) {
    if (!shiftStart || isNaN(shiftStart.valueOf())) {
      return res.status(400).json({ message: "Shift start time is required" });
    }
    if (!shiftEnd || isNaN(shiftEnd.valueOf())) {
      return res.status(400).json({ message: "Shift end time is required" });
    }
    if (!shiftPayCents || shiftPayCents <= 0) {
      return res.status(400).json({ message: "Shift pay is required" });
    }
  }

  if (!userId) {
    return res.status(401).json({ message: "Login required" });
  }

  db.query("SELECT verified FROM users WHERE id = ?", [userId], (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!users.length) return res.status(404).json({ message: "User not found" });
    if (!users[0].verified) return res.status(403).json({ message: "Your employer account is pending admin verification. Once an admin approves your account you will be able to post jobs. Contact support@jobportal.com if you need help." });

    const insertJob = async (companyId) => {
      const autoApprovalRaw = await getPlatformSetting("auto_approve_jobs", String(AUTO_APPROVAL_ENABLED));
      const autoApprovalEnabled = toBooleanSetting(autoApprovalRaw, AUTO_APPROVAL_ENABLED);

      const moderation = await evaluateJobModeration({
        title,
        description,
        location,
        jobType,
        category,
        autoApprovalEnabled
      });

      const isApproved = moderation.autoApproved ? 1 : 0;
      const feePercent = Number(process.env.SHIFT_FEE_PERCENT || 10);
      const feeCents = isShift ? Math.max(0, Math.round(shiftPayCents * (feePercent / 100))) : null;
      const totalCents = isShift ? (shiftPayCents + feeCents) : null;

      db.query(
        `INSERT INTO jobs
          (title, location, job_type, category, description, is_premium, posted_by, company_id, is_approved,
           is_shift, shift_start, shift_end, shift_pay_cents, shift_fee_cents, shift_total_cents, shift_currency, shift_paid, shift_status,
           application_deadline, moderation_status, moderation_score, moderation_reason, auto_approved_at, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ,[
          title,
          location,
          jobType,
          category,
          description,
          isPremium,
          userId,
          companyId || null,
          isApproved,
          isShift,
          shiftStart,
          shiftEnd,
          isShift ? shiftPayCents : null,
          isShift ? feeCents : null,
          isShift ? totalCents : null,
          shiftCurrency,
          isShift ? 1 : 0,
          isShift ? "open" : "open",
          applicationDeadline,
          moderation.status,
          moderation.score,
          moderation.reasonText,
          moderation.autoApproved ? new Date() : null,
          imageUrl
        ],
        (err, result) => {
          if (err) {
            // Fallback: if image_url column doesn't exist yet, retry without it
            if (err.code === "ER_BAD_FIELD_ERROR") {
              return db.query(
                `INSERT INTO jobs
                  (title, location, job_type, category, description, is_premium, posted_by, company_id, is_approved,
                   is_shift, shift_start, shift_end, shift_pay_cents, shift_fee_cents, shift_total_cents, shift_currency, shift_paid, shift_status,
                   application_deadline, moderation_status, moderation_score, moderation_reason, auto_approved_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ,[
                  title, location, jobType, category, description, isPremium, userId, companyId || null, isApproved,
                  isShift, shiftStart, shiftEnd, isShift ? shiftPayCents : null, isShift ? feeCents : null,
                  isShift ? totalCents : null, shiftCurrency, isShift ? 1 : 0, "open", applicationDeadline,
                  moderation.status, moderation.score, moderation.reasonText, moderation.autoApproved ? new Date() : null
                ],
                (err2, result2) => {
                  if (err2) return res.status(500).json({ error: err2.message });
                  if (isShift) notifyShiftAlerts(result2.insertId, { status: "posted" });
                  res.status(201).json({
                    message: moderation.autoApproved ? "Job posted and auto-approved successfully" : "Job submitted successfully and is pending admin review",
                    auto_approved: moderation.autoApproved,
                    moderation: { score: moderation.score, status: moderation.status, reason: moderation.reasonText, ai: moderation.aiAssessment || null }
                  });
                }
              );
            }
            return res.status(500).json({ error: err.message });
          }
          if (isShift) {
            notifyShiftAlerts(result.insertId, { status: "posted" });
          }
          res.status(201).json({
            message: moderation.autoApproved
              ? "Job posted and auto-approved successfully"
              : "Job submitted successfully and is pending admin review",
            auto_approved: moderation.autoApproved,
            moderation: {
              score: moderation.score,
              status: moderation.status,
              reason: moderation.reasonText,
              ai: moderation.aiAssessment || null
            }
          });
        }
      );
    };

    if (requestedCompanyId) {
      db.query(
        "SELECT id FROM companies WHERE id = ? AND owner_user_id = ?",
        [requestedCompanyId, userId],
        (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!rows.length) {
            return res.status(403).json({ message: "Company not found for this user" });
          }
          insertJob(requestedCompanyId);
        }
      );
      return;
    }

    db.query(
      "SELECT id FROM companies WHERE owner_user_id = ? LIMIT 1",
      [userId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const companyId = rows.length ? rows[0].id : null;
        insertJob(companyId);
      }
    );
  });
};


exports.applyJob = (req, res) => {
  const { jobId, userId } = req.body;

  db.query("SELECT id FROM jobs WHERE id = ?", [jobId], (err, jobs) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!jobs.length) return res.status(404).json({ message: "Invalid job" });

    db.query(
      "INSERT INTO applications (job_id, user_id) VALUES (?, ?)",
      [jobId, userId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "Application submitted successfully" });
      }
    );
  });
};

/* ─── Report a job listing ──────────────────────────────────────── */
const VALID_REPORT_REASONS = ["spam", "fake", "misleading", "inappropriate", "other"];

exports.reportJob = (req, res) => {
  const jobId = Number(req.params.id);
  if (!jobId || isNaN(jobId)) {
    return res.status(400).json({ message: "Invalid job" });
  }

  const reason = (req.body.reason || "").trim().toLowerCase();
  const details = (req.body.details || "").trim().slice(0, 1000);

  if (!VALID_REPORT_REASONS.includes(reason)) {
    return res.status(400).json({ message: `Reason must be one of: ${VALID_REPORT_REASONS.join(", ")}` });
  }

  const userId = req.user ? req.user.id : null;

  // Ensure job_reports table exists (idempotent)
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS job_reports (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      job_id     INT NOT NULL,
      user_id    INT,
      reason     VARCHAR(50) NOT NULL,
      details    TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_job_reports_job (job_id)
    )
  `;

  db.query(createTableSql, (createErr) => {
    if (createErr) {
      console.error("job_reports table create error:", createErr.message);
      return res.status(500).json({ message: "Database error" });
    }

    db.query(
      "INSERT INTO job_reports (job_id, user_id, reason, details) VALUES (?, ?, ?, ?)",
      [jobId, userId, reason, details || null],
      (insertErr) => {
        if (insertErr) {
          console.error("job_reports insert error:", insertErr.message);
          return res.status(500).json({ message: "Failed to submit report" });
        }
        res.json({ message: "Thank you — your report has been submitted and we'll review this listing." });
      }
    );
  });
};
