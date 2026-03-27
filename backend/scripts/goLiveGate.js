/*
  Go-live gate runner.
  - Ensures API is reachable (starts server if needed)
  - Runs preflight checks
  - Runs smoke tests
  - Verifies OAuth providers endpoint
  - Verifies report-job endpoint

  Usage:
    npm run test:go-live

  Optional env:
    BASE_URL=http://localhost:3000
    GO_LIVE_STRICT=1   (forces preflight with NODE_ENV=production)
*/

const { spawn } = require("child_process");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const STRICT = String(process.env.GO_LIVE_STRICT || "0") === "1";

const seekerCreds = {
  email: process.env.SMOKE_SEEKER_EMAIL || "alice@demo.local",
  password: process.env.SMOKE_SEEKER_PASSWORD || "Demo@1234"
};

const log = (m) => console.log(`[go-live] ${m}`);

function runNodeScript(scriptRelPath, extraEnv = {}) {
  const scriptPath = path.join(__dirname, scriptRelPath);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: path.join(__dirname, ".."),
      env: { ...process.env, ...extraEnv },
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${path.basename(scriptRelPath)} exited with code ${code}`));
    });
  });
}

async function waitForHealth(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function isApiUp() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function checkAuthProviders() {
  const res = await fetch(`${BASE_URL}/api/auth/providers`);
  if (!res.ok) {
    throw new Error(`/api/auth/providers failed with ${res.status}`);
  }
  const data = await res.json();
  if (typeof data.google !== "boolean" || typeof data.linkedin !== "boolean") {
    throw new Error("/api/auth/providers returned unexpected payload");
  }
  log(`oauth-providers -> google=${data.google}, linkedin=${data.linkedin}`);
}

async function checkReportEndpoint() {
  const loginRes = await fetch(`${BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(seekerCreds)
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.token) {
    throw new Error("seeker login failed for report endpoint check");
  }

  const jobsRes = await fetch(`${BASE_URL}/api/jobs`);
  const jobs = await jobsRes.json();
  const jobId = Array.isArray(jobs) && jobs.length ? jobs[0].id : null;

  if (!jobId) {
    throw new Error("no job available for report endpoint check");
  }

  const reportRes = await fetch(`${BASE_URL}/api/jobs/${jobId}/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${loginData.token}`
    },
    body: JSON.stringify({ reason: "spam", details: "Go-live gate validation" })
  });

  if (!reportRes.ok) {
    const body = await reportRes.text();
    throw new Error(`/api/jobs/:id/report failed with ${reportRes.status}: ${body}`);
  }

  log("report-endpoint -> ok");
}

(async () => {
  let serverProcess = null;

  try {
    log(`base-url: ${BASE_URL}`);
    log(`strict-mode: ${STRICT ? "on" : "off"}`);

    const apiAlreadyUp = await isApiUp();
    if (!apiAlreadyUp) {
      log("API not running, starting local server...");
      serverProcess = spawn(process.execPath, ["server.js"], {
        cwd: path.join(__dirname, ".."),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"]
      });

      serverProcess.stdout.on("data", (chunk) => process.stdout.write(String(chunk)));
      serverProcess.stderr.on("data", (chunk) => process.stderr.write(String(chunk)));

      const ready = await waitForHealth(25000);
      if (!ready) {
        throw new Error("server did not become healthy in time");
      }
    } else {
      log("API already running, reusing existing server.");
    }

    if (STRICT) {
      await runNodeScript("preflight.js", { NODE_ENV: "production" });
    } else {
      await runNodeScript("preflight.js");
    }

    await runNodeScript("smokeTest.js", { BASE_URL });
    await checkAuthProviders();
    await checkReportEndpoint();

    log("All go-live checks passed.");
    process.exit(0);
  } catch (err) {
    console.error(`[go-live:error] ${err.message}`);
    process.exit(1);
  } finally {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill("SIGTERM");
    }
  }
})();
