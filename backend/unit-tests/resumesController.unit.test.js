const assert = require("assert");
const controller = require("../controllers/resumesController");

function runResumesControllerUnitTests() {
  assert(controller && typeof controller === "object", "resumesController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "resumesController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "resumesController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: resumesController unit tests");
}

if (require.main === module) {
  try {
    runResumesControllerUnitTests();
  } catch (error) {
    console.error("FAIL: resumesController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runResumesControllerUnitTests };
