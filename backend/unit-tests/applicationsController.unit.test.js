const assert = require("assert");
const controller = require("../controllers/applicationsController");

function runApplicationsControllerUnitTests() {
  assert(controller && typeof controller === "object", "applicationsController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "applicationsController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "applicationsController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: applicationsController unit tests");
}

if (require.main === module) {
  try {
    runApplicationsControllerUnitTests();
  } catch (error) {
    console.error("FAIL: applicationsController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runApplicationsControllerUnitTests };
