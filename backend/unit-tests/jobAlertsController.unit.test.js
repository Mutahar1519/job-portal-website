const assert = require("assert");
const controller = require("../controllers/jobAlertsController");

function runJobAlertsControllerUnitTests() {
  assert(controller && typeof controller === "object", "jobAlertsController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "jobAlertsController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "jobAlertsController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: jobAlertsController unit tests");
}

if (require.main === module) {
  try {
    runJobAlertsControllerUnitTests();
  } catch (error) {
    console.error("FAIL: jobAlertsController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runJobAlertsControllerUnitTests };
