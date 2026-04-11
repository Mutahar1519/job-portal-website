const jwt = require("jsonwebtoken");

// JWT secret - REQUIRED from environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Fatal: JWT_SECRET environment variable is not set. This is required for authentication to work.');
}

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, is_admin: !!user.is_admin },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const signToken = generateToken;

module.exports = { generateToken, signToken, JWT_SECRET };
