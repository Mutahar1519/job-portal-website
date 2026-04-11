const db = require("../config/mysql");
const { sendMail } = require("./mailer");

const matchShiftAlerts = (job, callback) => {
  const sql = `
    SELECT DISTINCT u.id AS user_id, u.email, u.name
    FROM job_alerts a
    JOIN users u ON a.user_id = u.id
    WHERE a.is_active = 1
      AND (a.keyword IS NULL OR a.keyword = '' OR ? LIKE CONCAT('%', a.keyword, '%') OR ? LIKE CONCAT('%', a.keyword, '%'))
      AND (a.location IS NULL OR a.location = '' OR a.location = ?)
      AND (a.category IS NULL OR a.category = '' OR a.category = ?)
      AND (a.job_type IS NULL OR a.job_type = '' OR a.job_type = ?)
  `;

  const params = [
    job.title || "",
    job.description || "",
    job.location || "",
    job.category || "",
    job.job_type || ""
  ];

  db.query(sql, params, callback);
};

const insertNotifications = (job, users, status, paidAt, callback) => {
  if (!users.length) return callback(null);

  let pending = users.length;
  users.forEach((user) => {
    const sql = `
      INSERT INTO shift_notifications (user_id, job_id, status, paid_at, is_read, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        paid_at = COALESCE(VALUES(paid_at), paid_at),
        updated_at = NOW()
    `;

    db.query(sql, [user.user_id, job.id, status, paidAt], (err) => {
      if (err) {
        console.error("Shift notification insert failed:", err);
      }

      if (status === "posted" && user.email) {
        const subject = `New shift: ${job.title}`;
        const pay = job.shift_pay_cents ? `$${(job.shift_pay_cents / 100).toFixed(2)}` : "";
        const start = job.shift_start ? new Date(job.shift_start).toLocaleString() : "";
        const end = job.shift_end ? new Date(job.shift_end).toLocaleString() : "";
        const time = start && end ? `${start} - ${end}` : start || end;
        const details = [pay, time, job.location].filter(Boolean).join(" • ");

        const text = `A new paid shift was posted: ${job.title}\n${details}\nApply now: ${process.env.FRONTEND_URL || "http://localhost:3000"}/apply.html?jobId=${job.id}`;

        sendMail({
          to: user.email,
          subject,
          text
        })
          .catch((mailErr) => {
            console.error("Shift alert email failed:", mailErr);
          });
      }

      pending -= 1;
      if (pending === 0) {
        callback(null);
      }
    });
  });
};

const notifyShiftAlerts = (jobId, options = {}) => {
  const status = options.status || "posted";
  const paidAt = options.paidAt || null;

  db.query("SELECT * FROM jobs WHERE id = ?", [jobId], (err, rows) => {
    if (err) {
      console.error("Shift alert lookup failed:", err);
      return;
    }

    if (!rows.length) return;

    const job = rows[0];
    if (!job.is_shift) return;

    matchShiftAlerts(job, (err, users) => {
      if (err) {
        console.error("Shift alert match failed:", err);
        return;
      }

      insertNotifications(job, users || [], status, paidAt, () => {});
    });
  });
};

module.exports = {
  notifyShiftAlerts
};
