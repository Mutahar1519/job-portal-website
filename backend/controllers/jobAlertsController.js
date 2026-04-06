const db = require("../config/mysql");
const {
  canSendNotification,
  sendJobAlertEmail
} = require("./notificationsController");

// Bootstrap extra columns needed for shift alerts.
// Only ALTER missing columns to avoid lock contention on every server boot.
const SHIFT_ALERT_COLUMN_ALTERS = {
  title: "ALTER TABLE job_alerts ADD COLUMN title VARCHAR(200) NULL",
  preferred_days: "ALTER TABLE job_alerts ADD COLUMN preferred_days VARCHAR(200) NULL",
  min_pay_cents: "ALTER TABLE job_alerts ADD COLUMN min_pay_cents INT NULL DEFAULT 0",
  notifications_enabled: "ALTER TABLE job_alerts ADD COLUMN notifications_enabled TINYINT(1) NOT NULL DEFAULT 1",
  is_shift_alert: "ALTER TABLE job_alerts ADD COLUMN is_shift_alert TINYINT(1) NOT NULL DEFAULT 0",
};

function runSeqBootstrap(sqls, idx) {
  if (idx >= sqls.length) return;
  db.query(sqls[idx], [], (err) => {
    if (err && err.code !== "ER_DUP_FIELDNAME" && !String(err.message || "").includes("Duplicate column")) {
      console.warn("[jobAlerts] schema bootstrap:", err.message);
    }
    runSeqBootstrap(sqls, idx + 1);
  });
}

function bootstrapJobAlertsColumns() {
  const requiredColumns = Object.keys(SHIFT_ALERT_COLUMN_ALTERS);
  db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'job_alerts'
       AND COLUMN_NAME IN (?)`,
    [requiredColumns],
    (err, rows) => {
      if (err) {
        console.warn("[jobAlerts] schema bootstrap check:", err.message);
        return;
      }

      const existing = new Set((rows || []).map((row) => String(row.COLUMN_NAME || "").toLowerCase()));
      const alters = requiredColumns
        .filter((name) => !existing.has(name.toLowerCase()))
        .map((name) => SHIFT_ALERT_COLUMN_ALTERS[name]);

      if (alters.length) {
        runSeqBootstrap(alters, 0);
      }
    }
  );
}

bootstrapJobAlertsColumns();

const clean = (value) => (value || "").trim();

const normalize = (body) => {
  const rawCategory = clean(body.category);
  const customCategory = clean(body.category_custom);
  const category = rawCategory.toLowerCase() === "other"
    ? customCategory
    : rawCategory;

  return {
    title: clean(body.title),
    keyword: clean(body.keyword),
    location: clean(body.location),
    category,
    jobType: clean(body.job_type),
    frequency: clean(body.frequency) || "daily",
    isActive: body.is_active === false ? 0 : 1,
    preferredDays: clean(body.preferred_days),
    minPayCents: Number(body.min_pay_cents) || 0,
    notificationsEnabled: body.notifications_enabled === false ? 0 : 1,
    isShiftAlert: body.is_shift_alert ? 1 : 0,
  };
};

const validate = (payload) => {
  if (!payload.title && !payload.keyword && !payload.location && !payload.category && !payload.jobType) {
    return "Add at least one alert filter";
  }
  const allowed = ["daily", "weekly"];
  if (!allowed.includes(payload.frequency)) {
    return "Invalid frequency";
  }
  if (payload.keyword.length > 200) return "Keyword is too long";
  if (payload.location.length > 200) return "Location is too long";
  if (payload.category.length > 100) return "Category is too long";
  if (payload.jobType.length > 100) return "Job type is too long";
  return null;
};

exports.listAlerts = (req, res) => {
  db.query(
    "SELECT * FROM job_alerts WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
};

exports.createAlert = (req, res) => {
  const payload = normalize(req.body);
  const error = validate(payload);
  if (error) return res.status(400).json({ message: error });

  const params = [
    req.user.id,
    payload.title || null,
    payload.keyword || null,
    payload.location || null,
    payload.category || null,
    payload.jobType || null,
    payload.frequency,
    payload.isActive,
    payload.preferredDays || null,
    payload.minPayCents,
    payload.notificationsEnabled,
    payload.isShiftAlert,
  ];

  const fallbackInsert = () => {
    db.query(
      `INSERT INTO job_alerts
        (user_id, keyword, location, category, job_type, frequency, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
      ,[
        req.user.id,
        payload.keyword || null,
        payload.location || null,
        payload.category || null,
        payload.jobType || null,
        payload.frequency,
        payload.isActive,
      ],
      (legacyErr, legacyResult) => {
        if (legacyErr) {
          return res.status(500).json({ message: legacyErr.message, error: legacyErr.message });
        }

        db.query(
          "SELECT email FROM users WHERE id = ? LIMIT 1",
          [req.user.id],
          (emailErr, userRows) => {
            if (emailErr || !userRows.length || !userRows[0].email) return;

            canSendNotification(req.user.id, "job_alert_match", (prefErr, enabled) => {
              if (prefErr || !enabled) return;

              const title = payload.title || payload.keyword || "Your Job Alert";
              sendJobAlertEmail(req.user.id, userRows[0].email, legacyResult.insertId, {
                title,
                location: payload.location || "Remote",
                company_name: "JobPortal",
                salary_min: payload.minPayCents ? Math.round(Number(payload.minPayCents) / 100) : null
              }).catch((mailErr) => {
                console.warn("[jobAlerts] alert email send failed:", mailErr.message);
              });
            });
          }
        );

        res.status(201).json({ message: "Alert created", id: legacyResult.insertId });
      }
    );
  };

  db.query(
    `INSERT INTO job_alerts
      (user_id, title, keyword, location, category, job_type, frequency, is_active,
       preferred_days, min_pay_cents, notifications_enabled, is_shift_alert)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ,params,
    (err, result) => {
      if (err) {
        if (err.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(err.message || "")) {
          return fallbackInsert();
        }
        return res.status(500).json({ message: err.message, error: err.message });
      }

      db.query(
        "SELECT email FROM users WHERE id = ? LIMIT 1",
        [req.user.id],
        (emailErr, userRows) => {
          if (emailErr || !userRows.length || !userRows[0].email) return;

          canSendNotification(req.user.id, "job_alert_match", (prefErr, enabled) => {
            if (prefErr || !enabled) return;

            const title = payload.title || payload.keyword || "Your Job Alert";
            sendJobAlertEmail(req.user.id, userRows[0].email, result.insertId, {
              title,
              location: payload.location || "Remote",
              company_name: "JobPortal",
              salary_min: payload.minPayCents ? Math.round(Number(payload.minPayCents) / 100) : null
            }).catch((mailErr) => {
              console.warn("[jobAlerts] alert email send failed:", mailErr.message);
            });
          });
        }
      );

      res.status(201).json({ message: "Alert created", id: result.insertId });
    }
  );
};

exports.updateAlert = (req, res) => {
  const alertId = Number(req.params.id);
  if (!alertId) return res.status(400).json({ message: "Invalid alert" });

  const payload = normalize(req.body);
  const error = validate(payload);
  if (error) return res.status(400).json({ message: error });

  const params = [
    payload.title || null,
    payload.keyword || null,
    payload.location || null,
    payload.category || null,
    payload.jobType || null,
    payload.frequency,
    payload.isActive,
    payload.preferredDays || null,
    payload.minPayCents,
    payload.notificationsEnabled,
    payload.isShiftAlert,
    alertId,
    req.user.id
  ];

  const fallbackUpdate = () => {
    db.query(
      `UPDATE job_alerts
       SET keyword = ?, location = ?, category = ?, job_type = ?, frequency = ?, is_active = ?
       WHERE id = ? AND user_id = ?`
      ,[
        payload.keyword || null,
        payload.location || null,
        payload.category || null,
        payload.jobType || null,
        payload.frequency,
        payload.isActive,
        alertId,
        req.user.id
      ],
      (legacyErr, legacyResult) => {
        if (legacyErr) {
          return res.status(500).json({ message: legacyErr.message, error: legacyErr.message });
        }
        if (legacyResult.affectedRows === 0) {
          return res.status(404).json({ message: "Alert not found" });
        }
        res.json({ message: "Alert updated" });
      }
    );
  };

  db.query(
    `UPDATE job_alerts
     SET title = ?, keyword = ?, location = ?, category = ?, job_type = ?, frequency = ?, is_active = ?,
         preferred_days = ?, min_pay_cents = ?, notifications_enabled = ?, is_shift_alert = ?
     WHERE id = ? AND user_id = ?`
    ,params,
    (err, result) => {
      if (err) {
        if (err.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(err.message || "")) {
          return fallbackUpdate();
        }
        return res.status(500).json({ message: err.message, error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json({ message: "Alert updated" });
    }
  );
};

exports.deleteAlert = (req, res) => {
  const alertId = Number(req.params.id);
  if (!alertId) return res.status(400).json({ message: "Invalid alert" });

  db.query(
    "DELETE FROM job_alerts WHERE id = ? AND user_id = ?",
    [alertId, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message, error: err.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json({ message: "Alert deleted" });
    }
  );
};

exports.listShiftNotifications = (req, res) => {
  const tryWithDeadline = (includeDeadline) => {
    const sql = `
      SELECT n.id, n.job_id, n.status, n.paid_at, n.is_read, n.created_at,
             j.title, j.location, j.shift_start, j.shift_end, j.shift_pay_cents, j.shift_currency,
             ${includeDeadline ? "j.application_deadline," : "NULL AS application_deadline,"}
             ${includeDeadline
               ? "(CASE WHEN j.application_deadline IS NULL OR j.application_deadline > NOW() THEN 1 ELSE 0 END)"
               : "1"} AS is_open_for_applications
      FROM shift_notifications n
      JOIN jobs j ON n.job_id = j.id
      WHERE n.user_id = ?
        AND COALESCE(j.is_shift, 1) = 1
        AND COALESCE(j.is_approved, 1) = 1
        AND (j.shift_end IS NULL OR j.shift_end > NOW())
        ${includeDeadline ? "AND (j.application_deadline IS NULL OR j.application_deadline > NOW())" : ""}
      ORDER BY n.created_at DESC
      LIMIT 50
    `;
<<<<<<< HEAD

    db.query(sql, [req.user.id], (err, rows) => {
      if (err) {
        if ((err.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(err.message)) && includeDeadline) {
          return tryWithDeadline(false);
        }
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  };

=======
    db.query(sql, [req.user.id], (err, rows) => {
      if (err) {
        if ((err.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(err.message)) && includeDeadline) {
          return tryWithDeadline(false);
        }
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  };

>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
  tryWithDeadline(true);
};

exports.markShiftNotificationRead = (req, res) => {
  const notificationId = Number(req.params.id);
  if (!notificationId) return res.status(400).json({ message: "Invalid notification" });

  db.query(
    "UPDATE shift_notifications SET is_read = 1, updated_at = NOW() WHERE id = ? AND user_id = ?",
    [notificationId, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ message: "Notification marked read" });
    }
  );
};

exports.listJobNotifications = (req, res) => {
  db.query(
    "SELECT * FROM job_alerts WHERE user_id = ? AND is_active = 1",
    [req.user.id],
    (err, alerts) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!alerts.length) return res.json([]);

      const isMissingColumnError = (queryErr) => {
        return !!queryErr && (queryErr.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(queryErr.message || ""));
      };

      const buildAndRun = ({ includeDeadlineColumn, includeSalaryColumn }) => {
        const conditions = [];
        const params = [];

        conditions.push("COALESCE(j.is_shift, 0) = 0");
        conditions.push("COALESCE(j.is_approved, 1) = 1");
        if (includeDeadlineColumn) {
          conditions.push("(j.application_deadline IS NULL OR j.application_deadline > NOW())");
        }

        const alertConditions = alerts.map((alert) => {
          const parts = [];
          if (alert.keyword) {
            parts.push("(LOWER(j.title) LIKE LOWER(?) OR LOWER(j.description) LIKE LOWER(?))");
            params.push(`%${alert.keyword}%`);
            params.push(`%${alert.keyword}%`);
          }
          if (alert.location) {
            parts.push("LOWER(COALESCE(j.location, '')) LIKE LOWER(?)");
            params.push(`%${alert.location}%`);
          }
          if (alert.category) {
            parts.push("REPLACE(LOWER(COALESCE(j.category, '')), '-', ' ') LIKE LOWER(?)");
            params.push(`%${alert.category.replace(/-/g, " ")}%`);
          }
          if (alert.job_type) {
            // Normalize hyphens so "Full-time" matches "Full time" and vice-versa
            parts.push("REPLACE(LOWER(COALESCE(j.job_type, '')), '-', ' ') LIKE LOWER(?)");
            params.push(`%${alert.job_type.replace(/-/g, " ")}%`);
          }
          return parts.length ? `(${parts.join(" AND ")})` : "1=1";
        });

        if (alertConditions.length) {
          conditions.push(`(${alertConditions.join(" OR ")})`);
        }

        const sql = `
          SELECT DISTINCT j.id, j.title, j.location, j.category, j.job_type,
                 ${includeSalaryColumn ? "j.salary" : "NULL AS salary"},
                 j.description,
                 ${includeDeadlineColumn ? "j.application_deadline" : "NULL AS application_deadline"},
                 ${includeDeadlineColumn ? "(CASE WHEN j.application_deadline IS NULL OR j.application_deadline > NOW() THEN 1 ELSE 0 END)" : "1"} AS is_open_for_applications,
                 j.created_at
          FROM jobs j
          WHERE ${conditions.join(" AND ")}
          ORDER BY j.created_at DESC
          LIMIT 100
        `;

        db.query(sql, params, (queryErr, jobs) => {
          if (!queryErr) return res.json(jobs || []);

          if (isMissingColumnError(queryErr)) {
            if (includeSalaryColumn) {
              return buildAndRun({ includeDeadlineColumn, includeSalaryColumn: false });
            }
            if (includeDeadlineColumn) {
              return buildAndRun({ includeDeadlineColumn: false, includeSalaryColumn: false });
            }
          }

          return res.status(500).json({ error: queryErr.message });
        });
      };

      buildAndRun({ includeDeadlineColumn: true, includeSalaryColumn: true });
    }
  );
};
