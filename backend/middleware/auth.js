const jwt = require("jsonwebtoken");

/* REQUIRED LOGIN */
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, "secret123");
    req.user = decoded;
    next();
  } catch (err) {
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
    const decoded = jwt.verify(token, "secret123");
    req.user = decoded;
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
