const { spawnSync } = require("child_process");

function runStep(name, command, args) {
  console.log(`\n[go-live] ${name}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (result.status !== 0) {
    console.error(`[go-live] Failed at step: ${name}`);
    process.exit(result.status || 1);
  }
}

function run() {
  runStep("preflight", "node", ["scripts/preflight.js"]);
  runStep("oauth-config", "node", ["scripts/oauthConfigCheck.js"]);
  runStep("smoke", "node", ["scripts/smokeTest.js"]);
  console.log("\n[go-live] All go-live checks passed.");
}

run();
