const jwt = require("jsonwebtoken");

<<<<<<< HEAD
// Shared JWT secret - reads from environment variable
const JWT_SECRET = process.env.JWT_SECRET || "secret123";
=======
// Shared JWT secret - MUST match all JWT generation and verification
<<<<<<< HEAD
const JWT_SECRET = "secret123";
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
=======
const JWT_SECRET = process.env.JWT_SECRET || "secret123";
>>>>>>> 46123c6f49ef56229259ec1006b560ffd663fbb0

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, is_admin: !!user.is_admin },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
};

module.exports = { generateToken, JWT_SECRET };
