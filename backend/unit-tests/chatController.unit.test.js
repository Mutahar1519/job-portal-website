const assert = require("assert");
const controller = require("../controllers/chatController");

function runChatControllerUnitTests() {
  assert(controller && typeof controller === "object", "chatController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "chatController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "chatController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: chatController unit tests");
}

if (require.main === module) {
  try {
    runChatControllerUnitTests();
  } catch (error) {
    console.error("FAIL: chatController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runChatControllerUnitTests };
