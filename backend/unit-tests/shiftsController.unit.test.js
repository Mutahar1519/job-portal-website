const assert = require("assert");
const controller = require("../controllers/shiftsController");

function runShiftsControllerUnitTests() {
  assert(controller && typeof controller === "object", "shiftsController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "shiftsController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "shiftsController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: shiftsController unit tests");
}

if (require.main === module) {
  try {
    runShiftsControllerUnitTests();
  } catch (error) {
    console.error("FAIL: shiftsController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runShiftsControllerUnitTests };
