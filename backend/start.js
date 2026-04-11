#!/usr/bin/env node

/**
 * Clean startup script for the job portal backend.
 * Kills any existing node process on port 3000, then starts the server.
 * Usage: npm start or node start.js
 */

const { spawn } = require("child_process");
const os = require("os");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;

async function killExistingProcess() {
  return new Promise((resolve, reject) => {
    const isWindows = os.platform() === "win32";
    let cmd, args;

    if (isWindows) {
      // Windows: use powershell to forcefully kill all node processes
      cmd = "powershell.exe";
      args = [
        "-NoProfile",
        "-Command",
        `$ErrorActionPreference='SilentlyContinue'; Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }; Start-Sleep -Milliseconds 500`
      ];
    } else {
      // Unix: use lsof to find and kill processes on port 3000
      cmd = "sh";
      args = ["-c", `lsof -i :${PORT} | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null; sleep 1`];
    }

    const cleanup = spawn(cmd, args, {
      stdio: "ignore",
      shell: !isWindows
    });

    cleanup.on("close", (code) => {
      setTimeout(() => resolve(), 1500); // Wait for process to fully release port
    });

    cleanup.on("error", (err) => {
      // Silently ignore cleanup errors and continue
      setTimeout(() => resolve(), 1500);
    });

    setTimeout(() => resolve(), 4000); // Overall timeout
  });
}

async function startServer() {
  console.log(`[start] Cleaning up port ${PORT}...`);
  await killExistingProcess();

  console.log("[start] Starting backend server...");
  const server = spawn("node", ["server.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: false
  });

  server.on("error", (err) => {
    console.error("[start] Failed to start server:", err.message);
    process.exit(1);
  });

  server.on("close", (code) => {
    if (code !== 0) {
      console.error(`[start] Server exited with code ${code}`);
      process.exit(code);
    }
  });
}

startServer().catch((err) => {
  console.error("[start] Fatal error:", err);
  process.exit(1);
});
