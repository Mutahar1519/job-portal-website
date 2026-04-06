const jwt = require("jsonwebtoken");
const db = require("../config/db");

<<<<<<< HEAD
// Shared JWT secret - reads from environment variable
const JWT_SECRET = process.env.JWT_SECRET || "secret123";
=======
// Shared JWT secret - MUST match all JWT generation and verification
const JWT_SECRET = "secret123";
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.warn("[AdminAuth] ❌ No authorization header provided");
    return res.status(401).json({ message: "No token provided" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    console.warn("[AdminAuth] ❌ Invalid authorization header format");
    return res.status(401).json({ message: "Invalid token format" });
  }

  const token = parts[1];
  
  if (!token) {
    console.warn("[AdminAuth] ❌ No token after Bearer");
    return res.status(401).json({ message: "No token provided" });
  }

  // Log token info
  const tokenPreview = token.substring(0, 20) + "..." + token.substring(token.length - 20);
  console.log(`[AdminAuth] 🔐 Verifying token: ${tokenPreview}`);

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("[AdminAuth] ❌ JWT verification failed:");
      console.error("  Type:", err.name);
      console.error("  Message:", err.message);
      console.error("  Secret length:", JWT_SECRET.length);
      return res.status(401).json({ message: "Invalid token" });
    }

    // Verify decoded is an object and has an id
    if (!decoded || typeof decoded !== "object" || !decoded.id) {
      console.error("[AdminAuth] ❌ Invalid token payload:", decoded);
      return res.status(401).json({ message: "Invalid token payload" });
    }

    console.log(`[AdminAuth] ✅ Token verified. User ID: ${decoded.id}, is_admin: ${decoded.is_admin}`);

    // Check if user is admin in the database
    db.query(
      "SELECT id, is_admin, is_blocked, email FROM users WHERE id = ? LIMIT 1",
      [decoded.id],
      (err, users) => {
        if (err) {
          console.error("[AdminAuth] ❌ Database error:", err.message);
          return res.status(500).json({ message: "Database error" });
        }

        if (!users || users.length === 0) {
          console.warn(`[AdminAuth] ❌ User ${decoded.id} not found in database`);
          return res.status(403).json({ message: "User not found" });
        }

        const user = users[0];
        if (Number(user.is_blocked) === 1) {
          console.warn(`[AdminAuth] ❌ User ${decoded.id} (${user.email}) is blocked`);
          return res.status(403).json({ message: "Your account is blocked." });
        }
        if (!user.is_admin) {
          console.warn(`[AdminAuth] ❌ User ${decoded.id} (${user.email}) is not an admin`);
          return res.status(403).json({ message: "Admin only" });
        }

        console.log(`[AdminAuth] ✅ Admin access granted for user ${decoded.id} (${user.email})`);
        req.user = user;
        next();
      }
    );
  });
};
