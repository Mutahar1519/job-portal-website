const assert = require("assert");
const controller = require("../controllers/employerController");

function runEmployerControllerUnitTests() {
  assert(controller && typeof controller === "object", "employerController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "employerController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "employerController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: employerController unit tests");
}

if (require.main === module) {
  try {
    runEmployerControllerUnitTests();
  } catch (error) {
    console.error("FAIL: employerController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runEmployerControllerUnitTests };
