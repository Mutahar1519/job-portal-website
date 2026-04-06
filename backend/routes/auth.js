<<<<<<< HEAD
const express = require("express");
const router = express.Router();

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
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`;
  res.redirect(url);
});

/**
 * GET /api/auth/google/callback
 * Exchange code → tokens → user info, issue JWT.
 */
router.get("/google/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ message: "Missing OAuth code" });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(503).json({ message: "Google OAuth not configured" });
  }

  try {
    const base = process.env.OAUTH_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const redirectUri = `${base}/api/auth/google/callback`;

    // Exchange code for tokens
=======
/**
 * OAuth 2.0 routes for Google and LinkedIn.
 *
 * Required .env variables (set only if you want the provider enabled):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
 *   OAUTH_BASE_URL  (e.g. http://localhost:3000 — the public root of your app)
 */
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../config/mysql");
const { generateToken } = require("../utils/jwt");

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const LINKEDIN_CLIENT_ID     = process.env.LINKEDIN_CLIENT_ID     || "";
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || "";
const BASE_URL = (process.env.OAUTH_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const GOOGLE_REDIRECT   = `${BASE_URL}/api/auth/google/callback`;
const LINKEDIN_REDIRECT = `${BASE_URL}/api/auth/linkedin/callback`;

/* ─── Provider capability check ─────────────────────────────────── */
router.get("/providers", (_req, res) => {
  res.json({
    google:   !!GOOGLE_CLIENT_ID,
    linkedin: !!LINKEDIN_CLIENT_ID
  });
});

/* ─── Google ─────────────────────────────────────────────────────── */
router.get("/google", (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.redirect(`${BASE_URL}/login.html?error=oauth_not_configured`);
  }
  const params = new URLSearchParams({
    client_id:     GOOGLE_CLIENT_ID,
    redirect_uri:  GOOGLE_REDIRECT,
    response_type: "code",
    scope:         "openid email profile",
    access_type:   "offline",
    prompt:        "select_account"
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/google/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect(`${BASE_URL}/login.html?error=oauth_denied`);
  }
  try {
>>>>>>> 46123c6f49ef56229259ec1006b560ffd663fbb0
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
<<<<<<< HEAD
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
    const { signToken } = require("../utils/jwt");

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
    const token = signToken({ id: user.id, role: user.role, is_admin: user.is_admin });

    // Redirect to frontend with token
    const frontendBase = process.env.FRONTEND_URL || base;
    res.redirect(`${frontendBase}/login.html?token=${token}&oauth=google`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    res.status(500).json({ message: "OAuth failed" });
  }
});

=======
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri:  GOOGLE_REDIRECT,
        grant_type:    "authorization_code"
      })
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return res.redirect(`${BASE_URL}/login.html?error=oauth_failed`);
    }

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userInfo = await userInfoRes.json();
    if (!userInfo.email) {
      return res.redirect(`${BASE_URL}/login.html?error=oauth_failed`);
    }

    const token = await findOrCreateOAuthUser({
      email:      userInfo.email,
      name:       userInfo.name || userInfo.email,
      providerId: userInfo.sub
    });
    res.redirect(`${BASE_URL}/login.html?token=${encodeURIComponent(token)}&oauth=google`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.redirect(`${BASE_URL}/login.html?error=oauth_failed`);
  }
});

/* ─── LinkedIn ───────────────────────────────────────────────────── */
router.get("/linkedin", (req, res) => {
  if (!LINKEDIN_CLIENT_ID) {
    return res.redirect(`${BASE_URL}/login.html?error=oauth_not_configured`);
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id:     LINKEDIN_CLIENT_ID,
    redirect_uri:  LINKEDIN_REDIRECT,
    scope:         "openid profile email"
  });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

router.get("/linkedin/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect(`${BASE_URL}/login.html?error=oauth_denied`);
  }
  try {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        client_id:     LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        redirect_uri:  LINKEDIN_REDIRECT
      })
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return res.redirect(`${BASE_URL}/login.html?error=oauth_failed`);
    }

    // LinkedIn OpenID Connect userinfo endpoint
    const userInfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userInfo = await userInfoRes.json();
    if (!userInfo.email) {
      return res.redirect(`${BASE_URL}/login.html?error=oauth_failed`);
    }

    const fullName = userInfo.name ||
      [userInfo.given_name, userInfo.family_name].filter(Boolean).join(" ") ||
      userInfo.email;

    const token = await findOrCreateOAuthUser({
      email:      userInfo.email,
      name:       fullName,
      providerId: userInfo.sub
    });
    res.redirect(`${BASE_URL}/login.html?token=${encodeURIComponent(token)}&oauth=linkedin`);
  } catch (err) {
    console.error("LinkedIn OAuth error:", err);
    res.redirect(`${BASE_URL}/login.html?error=oauth_failed`);
  }
});

/* ─── Shared: find or create user by email ───────────────────────── */
const findOrCreateOAuthUser = (info) =>
  new Promise((resolve, reject) => {
    db.query(
      "SELECT id, name, email, role, is_admin, is_email_verified FROM users WHERE email = ? LIMIT 1",
      [info.email],
      (err, rows) => {
        if (err) return reject(err);

        if (rows.length) {
          const user = rows[0];
          // Auto-verify email when logging in via OAuth
          if (!user.is_email_verified) {
            db.query("UPDATE users SET is_email_verified = 1 WHERE id = ?", [user.id]);
          }
          return resolve(generateToken(user));
        }

        // New user — create with a random un-usable password
        const placeholder = bcrypt.hashSync(Math.random().toString(36) + Date.now(), 10);
        db.query(
          `INSERT INTO users (name, email, password, role, is_email_verified) VALUES (?, ?, ?, 'job_seeker', 1)`,
          [info.name || info.email, info.email, placeholder],
          (err2, result) => {
            if (err2) return reject(err2);
            resolve(generateToken({ id: result.insertId, email: info.email, is_admin: false }));
          }
        );
      }
    );
  });

>>>>>>> 46123c6f49ef56229259ec1006b560ffd663fbb0
module.exports = router;
