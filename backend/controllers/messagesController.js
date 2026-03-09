const db = require("../config/mysql");

const ensureParticipant = (applicationId, userId, callback, res) => {
  const sql = `
    SELECT a.user_id, j.posted_by
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.id = ?
  `;

  db.query(sql, [applicationId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ message: "Application not found" });

    const app = rows[0];
    if (app.user_id !== userId && app.posted_by !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    callback();
  });
};

exports.getMessages = (req, res) => {
  const applicationId = Number(req.params.id);
  if (!applicationId) return res.status(400).json({ message: "Invalid application" });

  ensureParticipant(applicationId, req.user.id, () => {
    db.query(
      `SELECT id, sender_id, message, created_at
       FROM application_messages
       WHERE application_id = ?
       ORDER BY created_at ASC`,
      [applicationId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      }
    );
  }, res);
};

exports.postMessage = (req, res) => {
  const applicationId = Number(req.params.id);
  const message = (req.body.message || "").trim();

  if (!applicationId) return res.status(400).json({ message: "Invalid application" });
  if (!message) return res.status(400).json({ message: "Message required" });
  if (message.length > 2000) return res.status(400).json({ message: "Message too long" });

  ensureParticipant(applicationId, req.user.id, () => {
    db.query(
      "INSERT INTO application_messages (application_id, sender_id, message) VALUES (?, ?, ?)",
      [applicationId, req.user.id, message],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "Message sent" });
      }
    );
  }, res);
};
