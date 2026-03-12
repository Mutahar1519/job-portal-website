const jwt = require("jsonwebtoken");

// Shared JWT secret - MUST match all JWT generation and verification
const JWT_SECRET = "secret123";

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, is_admin: !!user.is_admin },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
};

module.exports = { generateToken, JWT_SECRET };
