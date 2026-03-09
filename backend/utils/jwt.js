const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    "SECRET_KEY_123", // later move to .env
    { expiresIn: "1d" }
  );
};

module.exports = generateToken;
