const jwt = require("jsonwebtoken");
const db = require("../config/mysql");

// JWT secret - REQUIRED from environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Fatal: JWT_SECRET environment variable is not set. This is required for authentication to work.');
}

module.exports = (req, res, next) => {
  const rid = req.requestId || "no-request-id";
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.warn(`[AdminAuth][${rid}] Missing authorization header`);
    return res.status(401).json({ message: "No token provided" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    console.warn(`[AdminAuth][${rid}] Invalid authorization header format`);
    return res.status(401).json({ message: "Invalid token format" });
  }

  const token = parts[1];
  
  if (!token) {
    console.warn(`[AdminAuth][${rid}] Missing token after Bearer`);
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error(`[AdminAuth][${rid}] JWT verification failed:`, err.name);
      return res.status(401).json({ message: "Invalid token" });
    }

    // Verify decoded is an object and has an id
    if (!decoded || typeof decoded !== "object" || !decoded.id) {
      console.error(`[AdminAuth][${rid}] Invalid token payload`);
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Check if user is admin in the database
    db.query(
      "SELECT id, is_admin, is_blocked FROM users WHERE id = ? LIMIT 1",
      [decoded.id],
      (err, users) => {
        if (err) {
          console.error(`[AdminAuth][${rid}] Database error:`, err.message);
          return res.status(500).json({ message: "Database error" });
        }

        if (!users || users.length === 0) {
          console.warn(`[AdminAuth][${rid}] User not found`);
          return res.status(403).json({ message: "User not found" });
        }

        const user = users[0];
        if (Number(user.is_blocked) === 1) {
          console.warn(`[AdminAuth][${rid}] User is blocked`);
          return res.status(403).json({ message: "Your account is blocked." });
        }
        if (!user.is_admin) {
          console.warn(`[AdminAuth][${rid}] User is not admin`);
          return res.status(403).json({ message: "Admin only" });
        }

        req.user = user;
        next();
      }
    );
  });
};
