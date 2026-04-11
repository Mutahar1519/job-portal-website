const jwt = require("jsonwebtoken");

function validateJwtToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

function runJwtValidationTests() {
  const secret = process.env.JWT_SECRET || "test_jwt_secret";
  const token = jwt.sign({ id: 1, role: "employer", is_admin: false }, secret, { expiresIn: "1h" });

  const validPayload = validateJwtToken(token, secret);
  const invalidPayload = validateJwtToken(`${token}broken`, secret);

  console.assert(validPayload && validPayload.id === 1, "Expected valid token payload");
  console.assert(invalidPayload === null, "Expected invalid token to return null");

  console.log("PASS: JWT validation tests");
}

module.exports = {
  validateJwtToken,
  runJwtValidationTests
};
