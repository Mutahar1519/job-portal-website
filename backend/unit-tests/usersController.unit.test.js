const assert = require("assert");
const controller = require("../controllers/usersController");

function runUsersControllerUnitTests() {
  assert(controller && typeof controller === "object", "usersController should export an object");
  const exportNames = Object.keys(controller);
  assert(exportNames.length > 0, "usersController should export at least one handler");
  exportNames.forEach((name) => {
    assert.strictEqual(
      typeof controller[name],
      "function",
      "usersController export '" + name + "' should be a function"
    );
  });
  console.log("PASS: usersController unit tests");
}

if (require.main === module) {
  try {
    runUsersControllerUnitTests();
  } catch (error) {
    console.error("FAIL: usersController unit tests");
    console.error(error);
    process.exit(1);
  }
}

module.exports = { runUsersControllerUnitTests };
