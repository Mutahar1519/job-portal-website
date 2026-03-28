require("dotenv").config();

const googleOk = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const linkedinOk = Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
const baseUrl = process.env.OAUTH_BASE_URL || "http://localhost:3000";

if (!googleOk) {
  console.error("[oauth] Google OAuth is not fully configured.");
  console.error("[oauth] Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET");
  process.exit(1);
}

console.log("[oauth] Google OAuth: configured");
console.log(`[oauth] Google callback: ${baseUrl}/api/auth/google/callback`);

if (linkedinOk) {
  console.log("[oauth] LinkedIn OAuth: configured");
  console.log(`[oauth] LinkedIn callback: ${baseUrl}/api/auth/linkedin/callback`);
} else {
  console.log("[oauth] LinkedIn OAuth: optional and currently not configured");
}
