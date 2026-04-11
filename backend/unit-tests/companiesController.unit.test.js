const assert = require("assert");
const controller = require("../controllers/companiesController");

function runCompaniesControllerUnitTests() {
  assert(controller && typeof controller === "object", "companiesController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "companiesController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "companiesController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: companiesController unit tests");
}

if (require.main === module) {
  try {
    runCompaniesControllerUnitTests();
  } catch (error) {
    console.error("FAIL: companiesController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runCompaniesControllerUnitTests };
