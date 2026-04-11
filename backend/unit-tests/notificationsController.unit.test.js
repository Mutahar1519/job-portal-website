const assert = require("assert");
const controller = require("../controllers/notificationsController");

function runNotificationsControllerUnitTests() {
  assert(controller && typeof controller === "object", "notificationsController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "notificationsController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "notificationsController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: notificationsController unit tests");
}

if (require.main === module) {
  try {
    runNotificationsControllerUnitTests();
  } catch (error) {
    console.error("FAIL: notificationsController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runNotificationsControllerUnitTests };
