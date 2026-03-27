/*
  OAuth config checker.
  Usage:
    npm run test:oauth-config
*/

require("dotenv").config();

const baseUrlRaw = (process.env.OAUTH_BASE_URL || "http://localhost:3000").trim();
const baseUrl = baseUrlRaw.replace(/\/$/, "");

const required = [
  "OAUTH_BASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET"
];

const optional = ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"];

const placeholders = [/^your_/i, /^paste_/i, /^changeme$/i, /^<.*>$/, /^xxx/i];

const isMissing = (v) => !v || !String(v).trim();
const looksPlaceholder = (v) => placeholders.some((re) => re.test(String(v || "").trim()));

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

function run() {
  console.log("[oauth-check] Checking OAuth environment configuration...");

  const missing = [];
  const suspicious = [];

  for (const key of required) {
    const value = process.env[key];
    if (isMissing(value)) {
      missing.push(key);
      continue;
    }
    if (looksPlaceholder(value)) {
      suspicious.push(key);
    }
  }

  const optionalMissing = optional.filter((key) => isMissing(process.env[key]));

  if (!/^https?:\/\//i.test(baseUrl)) {
    suspicious.push("OAUTH_BASE_URL");
  }

  console.log("\n[oauth-check] Callback URLs to set in provider dashboards:");
  console.log(`- Google   : ${baseUrl}/api/auth/google/callback`);
  console.log(`- LinkedIn : ${baseUrl}/api/auth/linkedin/callback (optional)`);

  if (missing.length) {
    console.log("\n" + red(`[oauth-check] Missing values: ${missing.join(", ")}`));
  }

  if (suspicious.length) {
    console.log("\n" + yellow(`[oauth-check] Placeholder/suspicious values: ${[...new Set(suspicious)].join(", ")}`));
  }

  if (!missing.length && !suspicious.length) {
    if (optionalMissing.length) {
      console.log("\n" + yellow(`[oauth-check] LinkedIn is not configured (optional): ${optionalMissing.join(", ")}`));
      console.log("[oauth-check] Google OAuth is fully configured.");
    }
    console.log("\n" + green("[oauth-check] OAuth configuration looks complete."));
    process.exit(0);
  }

  console.log("\n[oauth-check] Next steps:");
  console.log("1) Create OAuth app in Google Cloud Console and copy Client ID/Secret.");
  console.log("2) (Optional) Create OAuth app in LinkedIn Developer portal and copy Client ID/Secret.");
  console.log("3) Paste values into backend/.env and run npm run test:oauth-config again.");
  process.exit(1);
}

run();
