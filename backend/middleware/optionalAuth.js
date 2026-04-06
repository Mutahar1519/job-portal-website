const jwt = require("jsonwebtoken");

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
    req.user = null; // guest user
    return next();
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id: userId }
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};
