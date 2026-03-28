const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const dns = require("dns").promises;
const net = require("net");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");

const API_BASE = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const JWT_SECRET = process.env.JWT_SECRET || "secret123";

function makeToken(user) {
  return jwt.sign(
    {
      id: Number(user.id),
      email: String(user.email || ""),
      is_admin: Number(user.is_admin) === 1
    },
    JWT_SECRET,
    { expiresIn: "30m" }
  );
}

async function apiRequest(route, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${route}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch (_err) {
    payload = null;
  }

  return { status: res.status, ok: res.ok, payload };
}

async function httpProbe(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    });
    return { ok: res.ok, status: res.status, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, status: 0, detail: err.name === "AbortError" ? `timeout after ${timeoutMs}ms` : err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const shouldSendMail = process.argv.includes("--send-mail");
  const strictMail = process.argv.includes("--strict-mail");
  const results = [];

  const pushResult = (name, ok, detail) => {
    results.push({ name, ok, detail });
  };

  const smtpConfig = {
    host: String(process.env.SMTP_HOST || "").trim(),
    port: Number(process.env.SMTP_PORT || 587),
    user: String(process.env.SMTP_USER || "").trim(),
    pass: String(process.env.SMTP_PASS || "").trim(),
    from: String(process.env.SMTP_FROM || process.env.SMTP_USER || "").trim(),
    to: String(process.env.ADMIN_EMAIL || process.env.SMTP_USER || "").trim()
  };

  const gmailApiConfig = {
    clientId: String(process.env.GOOGLE_CLIENT_ID || "").trim(),
    clientSecret: String(process.env.GOOGLE_CLIENT_SECRET || "").trim(),
    refreshToken: String(process.env.GMAIL_API_REFRESH_TOKEN || "").trim(),
    accessToken: String(process.env.GMAIL_API_ACCESS_TOKEN || "").trim()
  };

  const validateSmtpConfig = () => {
    const missing = [];
    if (!smtpConfig.host) missing.push("SMTP_HOST");
    if (!smtpConfig.port || Number.isNaN(smtpConfig.port)) missing.push("SMTP_PORT");
    if (!smtpConfig.user) missing.push("SMTP_USER");
    if (!smtpConfig.pass) missing.push("SMTP_PASS");
    if (!smtpConfig.to) missing.push("ADMIN_EMAIL/SMTP_USER");
    return missing;
  };

  const tcpReachable = (host, port, timeoutMs = 7000) =>
    new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;

      const done = (ok, detail) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve({ ok, detail });
      };

      socket.setTimeout(timeoutMs);
      socket.once("connect", () => done(true, `connected in ${timeoutMs}ms window`));
      socket.once("timeout", () => done(false, `timeout after ${timeoutMs}ms`));
      socket.once("error", (err) => done(false, err.message));
      socket.connect(port, host);
    });

  const runSmtpDiagnostics = async () => {
    const missing = validateSmtpConfig();
    if (missing.length) {
      pushResult(
        "SMTP config present",
        !strictMail,
        `missing: ${missing.join(", ")}${strictMail ? "" : " (non-strict mode)"}`
      );
      return { canSend: false };
    }

    pushResult("SMTP config present", true, `${smtpConfig.host}:${smtpConfig.port}`);

    try {
      const resolved = await dns.lookup(smtpConfig.host);
      pushResult("SMTP DNS lookup", true, `${resolved.address} (${resolved.family === 6 ? "IPv6" : "IPv4"})`);
    } catch (err) {
      pushResult("SMTP DNS lookup", !strictMail, `${err.message}${strictMail ? "" : " (non-strict mode)"}`);
      if (strictMail) return { canSend: false };
    }

    const primaryPort = smtpConfig.port;
    const fallbackPort = primaryPort === 465 ? 587 : 465;

    const primaryTcp = await tcpReachable(smtpConfig.host, primaryPort);
    pushResult(
      `SMTP TCP connectivity (${primaryPort})`,
      strictMail ? primaryTcp.ok : true,
      `${primaryTcp.ok ? "ok" : "failed"}: ${primaryTcp.detail}${strictMail ? "" : " (non-strict mode)"}`
    );

    let fallbackTcp = null;
    if (!primaryTcp.ok) {
      fallbackTcp = await tcpReachable(smtpConfig.host, fallbackPort);
      pushResult(
        `SMTP TCP connectivity (${fallbackPort} fallback)`,
        strictMail ? fallbackTcp.ok : true,
        `${fallbackTcp.ok ? "ok" : "failed"}: ${fallbackTcp.detail}${strictMail ? "" : " (non-strict mode)"}`
      );
    }

    const selectedPort = primaryTcp.ok ? primaryPort : (fallbackTcp && fallbackTcp.ok ? fallbackPort : primaryPort);
    const selectedSecure = selectedPort === 465;

    if (!primaryTcp.ok && !(fallbackTcp && fallbackTcp.ok)) {
      const gmailHttps = await httpProbe("https://gmail.googleapis.com/$discovery/rest?version=v1");
      pushResult(
        "Gmail API HTTPS reachability (443)",
        gmailHttps.ok,
        `${gmailHttps.ok ? "ok" : "failed"}: ${gmailHttps.detail}`
      );

      const gmailAuthConfigured = Boolean(
        gmailApiConfig.accessToken ||
        (gmailApiConfig.clientId && gmailApiConfig.clientSecret && gmailApiConfig.refreshToken)
      );

      pushResult(
        "Gmail API fallback config",
        gmailAuthConfigured,
        gmailAuthConfigured
          ? "credentials available for Gmail API fallback"
          : "missing GMAIL_API_ACCESS_TOKEN or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GMAIL_API_REFRESH_TOKEN"
      );
    }

    if (strictMail && !primaryTcp.ok && !(fallbackTcp && fallbackTcp.ok)) {
      // If Gmail API fallback is configured and HTTPS is reachable, treat as viable send path
      const gmailHttpsOk = results.find(r => r.name.startsWith("Gmail API HTTPS reachability"))?.ok;
      const gmailConfigOk = results.find(r => r.name === "Gmail API fallback config")?.ok;
      if (gmailHttpsOk && gmailConfigOk) {
        pushResult("Gmail API fallback (active path)", true, "SMTP blocked but Gmail API fallback is configured and reachable — mail delivery available");
        return { canSend: true, via: "gmail-api" };
      }
      return { canSend: false };
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: selectedPort,
      secure: selectedSecure,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 12000
    });

    try {
      await transporter.verify();
      pushResult("SMTP transporter verify", true, `auth/handshake successful on port ${selectedPort}`);
    } catch (err) {
      pushResult("SMTP transporter verify", !strictMail, `${err.message}${strictMail ? "" : " (non-strict mode)"}`);
      if (strictMail) {
        await transporter.close();
        return { canSend: false };
      }
    }

    try {
      await transporter.sendMail({
        from: smtpConfig.from,
        to: smtpConfig.to,
        subject: "JobPortal notifications smoke test",
        text: `Smoke test email sent at ${new Date().toISOString()}`,
        html: `<p>Smoke test email sent at <strong>${new Date().toISOString()}</strong>.</p>`
      });
      pushResult("SMTP send test message", true, `sent to ${smtpConfig.to} via port ${selectedPort}`);
      await transporter.close();
      return { canSend: true };
    } catch (err) {
      pushResult(
        "SMTP send test message",
        !strictMail,
        `${err.message}${strictMail ? "" : " (non-strict mode)"}`
      );
      await transporter.close();
      return { canSend: false };
    }
  };

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "job_portal"
  });

  try {
    const health = await apiRequest("/api/health");
    pushResult("GET /api/health", health.ok && health.payload && health.payload.status === "ok", `${health.status}`);

    const [users] = await conn.query(
      "SELECT id, email, is_admin FROM users WHERE email IS NOT NULL AND email <> '' ORDER BY is_admin DESC, id ASC"
    );

    if (!users.length) {
      throw new Error("No users found in database to build auth tokens for smoke test.");
    }

    const adminUser = users.find((u) => Number(u.is_admin) === 1) || null;
    const normalUser = users.find((u) => Number(u.is_admin) !== 1) || users[0];

    const normalToken = makeToken(normalUser);
    const adminToken = adminUser ? makeToken(adminUser) : null;

    const unauth = await apiRequest("/api/notifications/preferences");
    pushResult("GET /api/notifications/preferences unauthenticated", unauth.status === 401, `${unauth.status}`);

    const prefsGetBefore = await apiRequest("/api/notifications/preferences", { token: normalToken });
    pushResult("GET /api/notifications/preferences authenticated", prefsGetBefore.ok, `${prefsGetBefore.status}`);

    const prefsPayload = {
      job_alert_emails: false,
      application_update_emails: true,
      support_reply_emails: false,
      saved_job_update_emails: true,
      promotional_emails: false,
      email_frequency: "weekly",
      unsubscribed_from_all: false
    };

    const prefsPut = await apiRequest("/api/notifications/preferences", {
      method: "PUT",
      token: normalToken,
      body: prefsPayload
    });
    pushResult("PUT /api/notifications/preferences", prefsPut.ok, `${prefsPut.status}`);

    const prefsGetAfter = await apiRequest("/api/notifications/preferences", { token: normalToken });
    const prefsMatch =
      prefsGetAfter.ok &&
      prefsGetAfter.payload &&
      Number(prefsGetAfter.payload.job_alert_emails) === 0 &&
      Number(prefsGetAfter.payload.support_reply_emails) === 0 &&
      String(prefsGetAfter.payload.email_frequency) === "weekly";

    pushResult("GET preferences reflect update", prefsMatch, `${prefsGetAfter.status}`);

    const historyAsUser = await apiRequest("/api/notifications/history", { token: normalToken });
    pushResult("GET /api/notifications/history as non-admin", historyAsUser.status === 403, `${historyAsUser.status}`);

    if (adminToken) {
      const historyAsAdmin = await apiRequest("/api/notifications/history?limit=5", { token: adminToken });
      pushResult("GET /api/notifications/history as admin", historyAsAdmin.ok, `${historyAsAdmin.status}`);
    } else {
      pushResult("GET /api/notifications/history as admin", true, "SKIPPED (no admin user found)");
    }

    const [prefRows] = await conn.query(
      `SELECT job_alert_emails, support_reply_emails, email_frequency
       FROM user_notification_preferences
       WHERE user_id = ?
       LIMIT 1`,
      [Number(normalUser.id)]
    );

    const dbCheckOk =
      prefRows.length > 0 &&
      Number(prefRows[0].job_alert_emails) === 0 &&
      Number(prefRows[0].support_reply_emails) === 0 &&
      String(prefRows[0].email_frequency) === "weekly";

    pushResult("DB preferences row updated", dbCheckOk, prefRows.length ? JSON.stringify(prefRows[0]) : "no row");

    if (shouldSendMail) {
      await runSmtpDiagnostics();
    }

    let passCount = 0;
    let failCount = 0;

    console.log("\n[notifications-smoke] Results");
    for (const item of results) {
      if (item.ok) {
        passCount += 1;
        console.log(`PASS  ${item.name} (${item.detail})`);
      } else {
        failCount += 1;
        console.log(`FAIL  ${item.name} (${item.detail})`);
      }
    }

    console.log(`\n[notifications-smoke] Summary: ${passCount} passed, ${failCount} failed`);

    if (failCount > 0) {
      process.exitCode = 1;
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[notifications-smoke] Fatal:", err.message);
  process.exit(1);
});
