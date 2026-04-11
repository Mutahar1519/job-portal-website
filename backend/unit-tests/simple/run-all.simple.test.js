const { runEmailValidationTests } = require("./emailValidation.simple.test");
const { runPasswordHashingTests } = require("./passwordHashing.simple.test");
const { runJwtValidationTests } = require("./jwtValidation.simple.test");
const { runRbacTests } = require("./rbac.simple.test");
const { runJobValidationTests } = require("./jobCreationValidation.simple.test");
const { runValidationMiddlewareTests } = require("./validationMiddleware.simple.test");
const { runRequestIdMiddlewareTests } = require("./requestId.simple.test");

async function runAllSimpleTests() {
  runEmailValidationTests();
  await runPasswordHashingTests();
  runJwtValidationTests();
  runRbacTests();
  runJobValidationTests();
  runValidationMiddlewareTests();
  runRequestIdMiddlewareTests();
  console.log("\nAll split simple unit tests completed.");
}

runAllSimpleTests().catch((error) => {
  console.error("Simple test runner failed:", error);
  process.exit(1);
});
