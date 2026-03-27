const db = require("../config/mysql");

const isEmail = (value) => {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const ensureCompanyReviewsTable = () => {
  return new Promise((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS company_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        employer_user_id INT NULL,
        job_id INT NULL,
        reviewer_name VARCHAR(120) NOT NULL,
        reviewer_role VARCHAR(120) NOT NULL,
        reviewer_email VARCHAR(255) NULL,
        rating TINYINT NOT NULL,
        message VARCHAR(600) NOT NULL,
        approved TINYINT NOT NULL DEFAULT 0,
        is_hidden TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_company_reviews_company (company_id),
        INDEX idx_company_reviews_employer (employer_user_id),
        INDEX idx_company_reviews_job (job_id),
        CONSTRAINT fk_company_reviews_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT fk_company_reviews_employer FOREIGN KEY (employer_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_company_reviews_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    db.query(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

exports.getReviews = (req, res) => {
  const limit = Math.min(Number(req.query.limit || 12), 50);

  db.query(
    "SELECT name, role, rating, message, created_at FROM reviews WHERE approved = 1 AND is_hidden = 0 ORDER BY created_at DESC LIMIT ?",
    [limit],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to load reviews" });
      }
      res.json(rows);
    }
  );
};

exports.createReview = (req, res) => {
  const name = (req.body.name || "").trim();
  const role = (req.body.role || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const message = (req.body.message || "").trim();
  const rating = Number(req.body.rating || 0);

  if (!name || !role || !message || !rating) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!isEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (name.length > 120 || role.length > 120) {
    return res.status(400).json({ message: "Name or role too long" });
  }

  if (message.length > 600) {
    return res.status(400).json({ message: "Message too long" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be 1-5" });
  }

  db.query(
    "INSERT INTO reviews (name, role, email, rating, message, approved) VALUES (?, ?, ?, ?, ?, ?)",
    [name, role, email || null, rating, message, 0],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to save review" });
      }
      res.status(201).json({ message: "Review submitted for approval" });
    }
  );
};

exports.getCompanyReviews = async (req, res) => {
  const companyId = Number(req.params.companyId);
  const limit = Math.min(Number(req.query.limit || 12), 50);

  if (!companyId) {
    return res.status(400).json({ message: "Invalid company id" });
  }

  try {
    await ensureCompanyReviewsTable();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to initialize company reviews" });
  }

  db.query(
    `SELECT reviewer_name AS name, reviewer_role AS role, rating, message, created_at
     FROM company_reviews
     WHERE approved = 1 AND is_hidden = 0 AND company_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [companyId, limit],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to load company reviews" });
      }
      res.json(rows);
    }
  );
};

exports.createCompanyReview = async (req, res) => {
  const companyId = Number(req.params.companyId);
  const name = (req.body.name || "").trim();
  const role = (req.body.role || "Candidate").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const message = (req.body.message || "").trim();
  const rating = Number(req.body.rating || 0);
  const employerUserId = req.body.employer_user_id ? Number(req.body.employer_user_id) : null;
  const jobId = req.body.job_id ? Number(req.body.job_id) : null;

  if (!companyId) {
    return res.status(400).json({ message: "Invalid company id" });
  }

  if (!name || !role || !message || !rating) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!isEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (name.length > 120 || role.length > 120) {
    return res.status(400).json({ message: "Name or role too long" });
  }

  if (message.length > 600) {
    return res.status(400).json({ message: "Message too long" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be 1-5" });
  }

  try {
    await ensureCompanyReviewsTable();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to initialize company reviews" });
  }

  db.query(
    `INSERT INTO company_reviews
      (company_id, employer_user_id, job_id, reviewer_name, reviewer_role, reviewer_email, rating, message, approved)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId,
      Number.isFinite(employerUserId) ? employerUserId : null,
      Number.isFinite(jobId) ? jobId : null,
      name,
      role,
      email || null,
      rating,
      message,
      0
    ],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to save company review" });
      }
      res.status(201).json({ message: "Review submitted for approval" });
    }
  );
};
