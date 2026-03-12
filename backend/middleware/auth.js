const jwt = require("jsonwebtoken");
const db = require("../config/db");

// Shared JWT secret - MUST match all JWT generation and verification
const JWT_SECRET = "secret123";

/* REQUIRED LOGIN */
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    db.query("SELECT id, is_blocked FROM users WHERE id = ? LIMIT 1", [decoded.id], (err, rows) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (!rows.length) return res.status(401).json({ message: "Invalid token" });
      if (Number(rows[0].is_blocked) === 1) {
        return res.status(403).json({ message: "Your account is blocked." });
      }
      req.user = decoded;
      next();
    });
  } catch (err) {
    console.error("[Auth] Token verification failed:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ADMIN ONLY */
const adminOnly = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

/* OPTIONAL LOGIN */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    db.query("SELECT id, is_blocked FROM users WHERE id = ? LIMIT 1", [decoded.id], (err, rows) => {
      if (!err && rows.length && Number(rows[0].is_blocked) !== 1) {
        req.user = decoded;
      }
      next();
    });
    return;
  } catch (err) {
    // ignore
  }

  next();
};

module.exports = {
  auth,
  adminOnly,
  optionalAuth
};
