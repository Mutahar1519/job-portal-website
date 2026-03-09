const jwt = require("jsonwebtoken");
const db = require("../config/db");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, "secret123", (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });

    db.query(
      "SELECT * FROM users WHERE id = ? AND is_admin = 1",
      [decoded.id],
      (err, users) => {
        if (err || users.length === 0) {
          return res.status(403).json({ message: "Admin only" });
        }
        req.user = users[0];
        next();
      }
    );
  });
};
