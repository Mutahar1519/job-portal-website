const bcrypt = require("bcryptjs");

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

async function runPasswordHashingTests() {
  const plain = "Password123";
  const hashed = await hashPassword(plain);

  console.assert(hashed !== plain, "Hash should not match plain password");
  console.assert(await comparePassword(plain, hashed), "Correct password should match hash");
  console.assert(!(await comparePassword("wrongPassword", hashed)), "Wrong password should fail");

  console.log("PASS: Password hashing/comparison tests");
}

module.exports = {
  hashPassword,
  comparePassword,
  runPasswordHashingTests
};
