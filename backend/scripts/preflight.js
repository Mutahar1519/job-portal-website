require("dotenv").config();

const required = [
  "DB_HOST",
  "DB_USER",
  "DB_NAME",
  "JWT_SECRET",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "ADMIN_EMAIL",
  "OAUTH_BASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET"
];

const placeholderPatterns = [
  /CHANGE_ME/i,
  /YOUR_/i,
  /PASTE_/i,
  /example/i,
  /^test$/i,
  /^placeholder$/i
];

function isPlaceholder(value) {
  if (!value) return true;
  return placeholderPatterns.some((p) => p.test(String(value).trim()));
}

function run() {
  const strict = String(process.env.GO_LIVE_STRICT || "0") === "1";
  const missing = [];
  const placeholders = [];

  for (const key of required) {
    const value = process.env[key];
    if (!value || !String(value).trim()) {
      missing.push(key);
      continue;
    }
    if (strict && isPlaceholder(value)) {
      placeholders.push(key);
    }
  }

  if (missing.length) {
    console.error("[preflight] Missing required env vars:");
    missing.forEach((k) => console.error(` - ${k}`));
    process.exit(1);
  }

  if (placeholders.length) {
    console.error("[preflight] Placeholder-like values found (strict mode):");
    placeholders.forEach((k) => console.error(` - ${k}`));
    process.exit(1);
  }

  console.log("[preflight] Environment checks passed.");
}

run();
