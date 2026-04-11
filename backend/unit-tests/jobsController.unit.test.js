const assert = require("assert");
const controller = require("../controllers/jobsController");

function runJobsControllerUnitTests() {
  assert(controller && typeof controller === "object", "jobsController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "jobsController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "jobsController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: jobsController unit tests");
}

if (require.main === module) {
  try {
    runJobsControllerUnitTests();
  } catch (error) {
    console.error("FAIL: jobsController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runJobsControllerUnitTests };
