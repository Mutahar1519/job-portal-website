const assert = require("assert");
const controller = require("../controllers/recommendationsController");

function runRecommendationsControllerUnitTests() {
  assert(controller && typeof controller === "object", "recommendationsController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "recommendationsController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "recommendationsController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: recommendationsController unit tests");
}

if (require.main === module) {
  try {
    runRecommendationsControllerUnitTests();
  } catch (error) {
    console.error("FAIL: recommendationsController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runRecommendationsControllerUnitTests };
