const db = require("../config/mysql");

const clean = (value) => (value || "").trim();

const normalize = (body) => {
  return {
    keyword: clean(body.keyword),
    location: clean(body.location),
    category: clean(body.category),
    jobType: clean(body.job_type),
    frequency: clean(body.frequency) || "daily",
    isActive: body.is_active === false ? 0 : 1
  };
};

const validate = (payload) => {
  if (!payload.keyword && !payload.location && !payload.category && !payload.jobType) {
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
      payload.isActive
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
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
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
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
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json({ message: "Alert deleted" });
    }
  );
};

exports.listShiftNotifications = (req, res) => {
  const sql = `
    SELECT n.id, n.job_id, n.status, n.paid_at, n.is_read, n.created_at,
           j.title, j.location, j.shift_start, j.shift_end, j.shift_pay_cents, j.shift_currency
    FROM shift_notifications n
    JOIN jobs j ON n.job_id = j.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `;

  db.query(sql, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
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
