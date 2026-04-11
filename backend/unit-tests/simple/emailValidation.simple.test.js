function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "");
}

function runEmailValidationTests() {
  console.assert(isEmail("student@example.com") === true, "Expected valid email to pass");
  console.assert(isEmail("abc.def@uni.edu") === true, "Expected valid email to pass");

  console.assert(isEmail("bad-email") === false, "Expected invalid email to fail");
  console.assert(isEmail("noatsign.com") === false, "Expected invalid email to fail");
  console.assert(isEmail("") === false, "Expected empty email to fail");

  console.log("PASS: Email validation tests");
}

module.exports = {
  isEmail,
  runEmailValidationTests
};
