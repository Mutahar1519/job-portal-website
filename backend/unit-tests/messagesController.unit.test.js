const assert = require("assert");
const controller = require("../controllers/messagesController");

function runMessagesControllerUnitTests() {
  assert(controller && typeof controller === "object", "messagesController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "messagesController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "messagesController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: messagesController unit tests");
}

if (require.main === module) {
  try {
    runMessagesControllerUnitTests();
  } catch (error) {
    console.error("FAIL: messagesController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runMessagesControllerUnitTests };
