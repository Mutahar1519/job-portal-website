const db = require("../config/mysql");

const isEmail = (value) => {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

/* === COMPANY REVIEWS === */

exports.getCompanyReviews = (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (!companyId) return res.status(400).json({ message: "Invalid company" });

  const ensureTable =
    "CREATE TABLE IF NOT EXISTS company_reviews (" +
    "  id INT AUTO_INCREMENT PRIMARY KEY," +
    "  company_id INT NOT NULL," +
    "  user_id INT," +
    "  reviewer_name VARCHAR(120)," +
    "  rating TINYINT NOT NULL," +
    "  message TEXT," +
    "  approved TINYINT(1) DEFAULT 0," +
    "  is_hidden TINYINT(1) DEFAULT 0," +
    "  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
    ")";

  db.query(ensureTable, (err) => {
    if (err) return res.status(500).json({ message: "DB error" });
    db.query(
      "SELECT reviewer_name, rating, message, created_at FROM company_reviews WHERE company_id = ? AND approved = 1 AND is_hidden = 0 ORDER BY created_at DESC LIMIT 20",
      [companyId],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "Failed to load reviews" });
        res.json(rows);
      }
    );
  });
};

exports.createCompanyReview = (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (!companyId) return res.status(400).json({ message: "Invalid company" });

  const reviewerName = (req.body.reviewer_name || req.body.name || "").trim().slice(0, 120);
  const rating = parseInt(req.body.rating);
  const message = (req.body.message || "").trim().slice(0, 1000);
  const userId = req.user?.id || null;

  if (!reviewerName) return res.status(400).json({ message: "Name is required" });
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating must be 1-5" });
  if (!message) return res.status(400).json({ message: "Review message required" });

  const ensureTable =
    "CREATE TABLE IF NOT EXISTS company_reviews (" +
    "  id INT AUTO_INCREMENT PRIMARY KEY," +
    "  company_id INT NOT NULL," +
    "  user_id INT," +
    "  reviewer_name VARCHAR(120)," +
    "  rating TINYINT NOT NULL," +
    "  message TEXT," +
    "  approved TINYINT(1) DEFAULT 0," +
    "  is_hidden TINYINT(1) DEFAULT 0," +
    "  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
    ")";

  db.query(ensureTable, (err) => {
    if (err) return res.status(500).json({ message: "DB error" });
    db.query(
      "INSERT INTO company_reviews (company_id, user_id, reviewer_name, rating, message, approved) VALUES (?, ?, ?, ?, ?, 0)",
      [companyId, userId, reviewerName, rating, message],
      (err) => {
        if (err) return res.status(500).json({ message: "Failed to save review" });
        res.status(201).json({ message: "Review submitted for approval. Thank you!" });
      }
    );
  });
};
