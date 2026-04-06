const db = require("../config/mysql");

const SHIFT_FEE_PERCENT = Number(process.env.SHIFT_FEE_PERCENT || 10);
const SHIFT_CURRENCY = process.env.SHIFT_CURRENCY || "usd";
const ALLOWED_PAYMENT_METHODS = ["card", "applepay", "gpay", "paypal", "bank_transfer"];

const normalizePaymentMethod = (value) => {
  const method = String(value || "card").trim().toLowerCase();
  if (!ALLOWED_PAYMENT_METHODS.includes(method)) return null;
  return method;
};

const computeFee = (payCents) => {
  const fee = Math.round(payCents * (SHIFT_FEE_PERCENT / 100));
  return Math.max(0, fee);
};

const releaseIfDue = (escrowId, callback) => {
  const sql = `
    UPDATE shift_escrows
    SET status = 'released', released_at = NOW()
    WHERE id = ? AND status = 'awaiting_confirmation' AND release_at <= NOW()
  `;

  db.query(sql, [escrowId], (err) => {
    if (err) return callback(err);
    callback(null);
  });
};

exports.acceptShiftApplication = (req, res) => {
  const applicationId = Number(req.params.applicationId);
  if (!applicationId) return res.status(400).json({ message: "Invalid application" });

  const selectedPaymentMethod = normalizePaymentMethod(req.body && req.body.payment_method);
  if (!selectedPaymentMethod) {
    return res.status(400).json({ message: "Invalid payment method. Allowed: " + ALLOWED_PAYMENT_METHODS.join(", ") });
  }
  }

  const sql = `
    SELECT a.id AS application_id, a.user_id AS worker_id,
           j.id AS job_id, j.posted_by, j.is_shift, j.shift_pay_cents, j.shift_currency, j.shift_status
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.id = ?
  `;

  db.query(sql, [applicationId], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!rows.length) return res.status(404).json({ message: "Application not found" });

    const record = rows[0];
    if (!record.is_shift) return res.status(400).json({ message: "Not a shift job" });
    if (record.posted_by !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (record.shift_status !== "open") {
      return res.status(400).json({ message: "Shift is not open" });
    }

    const payCents = Number(record.shift_pay_cents || 0);
    if (!payCents) return res.status(400).json({ message: "Shift pay not set" });

    const feeCents = computeFee(payCents);
    const totalCents = payCents + feeCents;

    const createEscrowSql = `
      INSERT INTO shift_escrows
        (job_id, application_id, client_id, worker_id, pay_cents, fee_cents, total_cents, currency, payment_method, release_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))
    `;

    const createEscrowSqlLegacy = `
      INSERT INTO shift_escrows
        (job_id, application_id, client_id, worker_id, pay_cents, fee_cents, total_cents, currency, release_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))
    `;

    const createEscrowParams = [
      record.job_id,
      record.application_id,
      record.posted_by,
      record.worker_id,
      payCents,
      feeCents,
      totalCents,
      record.shift_currency || SHIFT_CURRENCY,
      selectedPaymentMethod
    ];

    const createEscrowParamsLegacy = [
      record.job_id,
      record.application_id,
      record.posted_by,
      record.worker_id,
      payCents,
      feeCents,
      totalCents,
      record.shift_currency || SHIFT_CURRENCY
    ];

    const finalizeAcceptedShift = () => {
      db.query(
        "UPDATE jobs SET shift_status = 'booked' WHERE id = ?",
        [record.job_id],
        (updateErr) => {
          if (updateErr) return res.status(500).json({ message: "Failed to update shift" });
          res.json({
            message: "Worker accepted. Escrow created with auto-release in 24h.",
            payment_method: selectedPaymentMethod
          });
        }
      );
    };

    db.query(
      createEscrowSql,
      createEscrowParams,
      (err) => {
        if (err) {
          if (err.code === "ER_BAD_FIELD_ERROR" || /Unknown column/i.test(err.message || "")) {
            return db.query(createEscrowSqlLegacy, createEscrowParamsLegacy, (legacyErr) => {
              if (legacyErr) {
                if (legacyErr.code === "ER_DUP_ENTRY") {
                  return res.status(409).json({ message: "Shift already accepted" });
                }
                return res.status(500).json({ message: "Failed to create escrow" });
              }

              return finalizeAcceptedShift();
            });
          }

          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Shift already accepted" });
          }
          return res.status(500).json({ message: "Failed to create escrow" });
        }

        finalizeAcceptedShift();
      }
    );
  });
};

exports.clientConfirmShift = (req, res) => {
  const jobId = Number(req.params.jobId);
  if (!jobId) return res.status(400).json({ message: "Invalid job" });

  const sql = `
    SELECT e.id AS escrow_id, e.status, e.worker_confirmed, e.client_confirmed
    FROM shift_escrows e
    JOIN jobs j ON e.job_id = j.id
    WHERE e.job_id = ? AND j.posted_by = ?
  `;

  db.query(sql, [jobId, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!rows.length) return res.status(404).json({ message: "Escrow not found" });

    const escrow = rows[0];
    if (escrow.status !== "awaiting_confirmation") {
      return res.status(400).json({ message: "Escrow is not awaiting confirmation" });
    }

    db.query(
      "UPDATE shift_escrows SET client_confirmed = 1 WHERE id = ?",
      [escrow.escrow_id],
      (err) => {
        if (err) return res.status(500).json({ message: "Failed to confirm" });

        if (escrow.worker_confirmed) {
          return releaseIfDue(escrow.escrow_id, (err) => {
            if (err) return res.status(500).json({ message: "Failed to release" });
            return res.json({ message: "Shift confirmed and released" });
          });
        }

        res.json({ message: "Client confirmed. Awaiting worker confirmation or auto-release in 24h." });
      }
    );
  });
};

exports.workerConfirmShift = (req, res) => {
  const jobId = Number(req.params.jobId);
  if (!jobId) return res.status(400).json({ message: "Invalid job" });

  const sql = `
    SELECT e.id AS escrow_id, e.status, e.client_confirmed, e.worker_confirmed
    FROM shift_escrows e
    JOIN applications a ON e.application_id = a.id
    WHERE e.job_id = ? AND a.user_id = ?
  `;

  db.query(sql, [jobId, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!rows.length) return res.status(404).json({ message: "Escrow not found" });

    const escrow = rows[0];
    if (escrow.status !== "awaiting_confirmation") {
      return res.status(400).json({ message: "Escrow is not awaiting confirmation" });
    }

    db.query(
      "UPDATE shift_escrows SET worker_confirmed = 1 WHERE id = ?",
      [escrow.escrow_id],
      (err) => {
        if (err) return res.status(500).json({ message: "Failed to confirm" });

        if (escrow.client_confirmed) {
          return releaseIfDue(escrow.escrow_id, (err) => {
            if (err) return res.status(500).json({ message: "Failed to release" });
            return res.json({ message: "Shift confirmed and released" });
          });
        }

        res.json({ message: "Worker confirmed. Awaiting client confirmation or auto-release in 24h." });
      }
    );
  });
};

exports.getShiftStatus = (req, res) => {
  const jobId = Number(req.params.jobId);
  if (!jobId) return res.status(400).json({ message: "Invalid job" });

  const sql = `
    SELECT e.id, e.status, e.client_confirmed, e.worker_confirmed, e.release_at, e.released_at
    FROM shift_escrows e
    JOIN jobs j ON e.job_id = j.id
    WHERE e.job_id = ? AND (j.posted_by = ? OR e.worker_id = ?)
  `;

  db.query(sql, [jobId, req.user.id, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!rows.length) return res.status(404).json({ message: "Escrow not found" });

    const escrow = rows[0];

    releaseIfDue(escrow.id, (err) => {
      if (err) return res.status(500).json({ message: "Failed to release" });
      db.query(
        "SELECT id, status, client_confirmed, worker_confirmed, release_at, released_at FROM shift_escrows WHERE id = ?",
        [escrow.id],
        (err, refreshed) => {
          if (err) return res.status(500).json({ message: "Database error" });
          res.json(refreshed[0]);
        }
      );
    });
  });
};

exports.computeShiftTotals = (payCents) => {
  const feeCents = computeFee(payCents);
  return {
    pay_cents: payCents,
    fee_cents: feeCents,
    total_cents: payCents + feeCents,
    currency: SHIFT_CURRENCY
  };
};
