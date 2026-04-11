const assert = require("assert");
const controller = require("../controllers/savedJobsController");

function runSavedJobsControllerUnitTests() {
  assert(controller && typeof controller === "object", "savedJobsController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "savedJobsController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "savedJobsController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: savedJobsController unit tests");
}

if (require.main === module) {
  try {
    runSavedJobsControllerUnitTests();
  } catch (error) {
    console.error("FAIL: savedJobsController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runSavedJobsControllerUnitTests };
