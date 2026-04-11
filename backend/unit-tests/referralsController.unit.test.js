const assert = require("assert");
const controller = require("../controllers/referralsController");

function runReferralsControllerUnitTests() {
  assert(controller && typeof controller === "object", "referralsController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "referralsController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "referralsController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: referralsController unit tests");
}

if (require.main === module) {
  try {
    runReferralsControllerUnitTests();
  } catch (error) {
    console.error("FAIL: referralsController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runReferralsControllerUnitTests };
