<<<<<<< HEAD
require("dotenv").config();

const required = [
  "DB_HOST",
  "DB_USER",
  "DB_NAME",
  "JWT_SECRET",
=======
/*
  Production preflight checks.
  Usage:
    NODE_ENV=production node scripts/preflight.js
*/

require("dotenv").config();

const requiredAlways = [
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "JWT_SECRET",
  "PORT",
  "CORS_ORIGINS"
];

const requiredProd = [
>>>>>>> 46123c6f49ef56229259ec1006b560ffd663fbb0
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
<<<<<<< HEAD
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
=======
  "SMTP_FROM"
];

const placeholderPatterns = [
  /your_password_here/i,
  /your_secure_jwt_secret_here/i,
  /your_email@gmail\.com/i,
  /your_app_password/i,
  /^secret123$/i,
  /^changeme$/i
];

function isMissing(name) {
  const value = process.env[name];
  return !value || !String(value).trim();
}

function looksPlaceholder(value) {
  const text = String(value || "").trim();
  return placeholderPatterns.some((re) => re.test(text));
}

function run() {
  const nodeEnv = (process.env.NODE_ENV || "development").toLowerCase();
  const missing = [];
  const placeholders = [];

  for (const key of requiredAlways) {
    if (isMissing(key)) missing.push(key);
  }

  if (nodeEnv === "production") {
    for (const key of requiredProd) {
      if (isMissing(key)) missing.push(key);
    }
  }

  const keysToInspect = [
    ...requiredAlways,
    ...(nodeEnv === "production" ? requiredProd : []),
    ...(nodeEnv === "production" ? ["HUGGINGFACE_API_KEY", "STRIPE_SECRET_KEY"] : [])
  ];
  for (const key of keysToInspect) {
    const value = process.env[key];
    if (value && looksPlaceholder(value)) {
>>>>>>> 46123c6f49ef56229259ec1006b560ffd663fbb0
      placeholders.push(key);
    }
  }

<<<<<<< HEAD
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
=======
  console.log(`[preflight] NODE_ENV=${nodeEnv}`);

  if (missing.length) {
    console.error(`[preflight] Missing required env vars: ${missing.join(", ")}`);
  }

  if (placeholders.length) {
    console.error(`[preflight] Placeholder values detected: ${placeholders.join(", ")}`);
  }

  if (!missing.length && !placeholders.length) {
    console.log("[preflight] Environment checks passed.");
    process.exit(0);
  }

  if (nodeEnv !== "production") {
    console.warn("[preflight] Non-production mode: failing to force fixes before go-live.");
  }

  process.exit(1);
>>>>>>> 46123c6f49ef56229259ec1006b560ffd663fbb0
}

run();
