const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const oauthStateStore = new Map();

const createOAuthState = () => {
  const state = crypto.randomBytes(24).toString("hex");
  oauthStateStore.set(state, Date.now() + OAUTH_STATE_TTL_MS);
  return state;
};

const consumeOAuthState = (state) => {
  if (!state) return false;
  const expiresAt = oauthStateStore.get(state);
  oauthStateStore.delete(state);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
};

setInterval(() => {
  const now = Date.now();
  for (const [state, expiresAt] of oauthStateStore.entries()) {
    if (expiresAt <= now) oauthStateStore.delete(state);
  }
}, 5 * 60 * 1000);

/**
 * GET /api/auth/providers
 * Returns which OAuth providers are configured.
 * LinkedIn is intentionally disabled.
 */
router.get("/providers", (req, res) => {
  const googleConfigured = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  res.json({
    google: googleConfigured,
    linkedin: false,
  });
});

/**
 * GET /api/auth/google
 * Redirect to Google OAuth consent screen.
 */
router.get("/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ message: "Google OAuth not configured" });
  }
  const base = process.env.OAUTH_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const redirectUri = encodeURIComponent(`${base}/api/auth/google/callback`);
  const scope = encodeURIComponent("openid email profile");
  const state = createOAuthState();
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account&state=${state}`;
  res.redirect(url);
});

/**
 * GET /api/auth/google/callback
 * Exchange code → tokens → user info, issue JWT.
 */
router.get("/google/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).json({ message: "Missing OAuth code" });
  if (!consumeOAuthState(String(state || ""))) {
    return res.status(400).json({ message: "Invalid OAuth state" });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(503).json({ message: "Google OAuth not configured" });
  }

  try {
    const base = process.env.OAUTH_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const redirectUri = `${base}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(401).json({ message: "Failed to obtain access token" });
    }

    // Get user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json();
    if (!googleUser.email) {
      return res.status(401).json({ message: "Could not retrieve email from Google" });
    }

    // Find or create user in DB
    const db = require("../config/mysql");
    const { generateToken } = require("../utils/jwt");

    const find = () =>
      new Promise((resolve, reject) =>
        db.query("SELECT * FROM users WHERE email = ?", [googleUser.email], (err, rows) =>
          err ? reject(err) : resolve(rows)
        )
      );

    const create = () =>
      new Promise((resolve, reject) =>
        db.query(
          "INSERT INTO users (name, email, password, role, verified) VALUES (?, ?, '', 'job_seeker', 1)",
          [googleUser.name || googleUser.email, googleUser.email],
          (err, result) => (err ? reject(err) : resolve(result.insertId))
        )
      );

    let users = await find();
    let userId;
    if (users.length > 0) {
      userId = users[0].id;
    } else {
      userId = await create();
      users = await find();
    }

    const user = users[0];
    const token = generateToken({ id: user.id, email: user.email, is_admin: user.is_admin });

    // Redirect to frontend with token
    const frontendBase = process.env.FRONTEND_URL || base;
    res.redirect(`${frontendBase}/login.html?token=${token}&oauth=google`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    res.status(500).json({ message: "OAuth failed" });
  }
});
module.exports = router;
