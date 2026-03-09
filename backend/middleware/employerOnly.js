const db = require("../config/mysql");

module.exports = (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Login required" });
  }

  db.query(
    "SELECT role, is_admin FROM users WHERE id = ?",
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return res.status(404).json({ message: "User not found" });

      const user = rows[0];
      if (user.is_admin || user.role === "employer") {
        return next();
      }

      return res.status(403).json({ message: "Employer access only" });
    }
  );
};
