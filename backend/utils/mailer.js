const nodemailer = require("nodemailer");

let transporter = null;
let gmailTokenCache = {
  accessToken: "",
  expiresAt: 0
};

function getSmtpTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const port = parseInt(SMTP_PORT || "587", 10);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 12000
  });

  return transporter;
}

function hasGmailApiConfig() {
  const accessToken = String(process.env.GMAIL_API_ACCESS_TOKEN || "").trim();
  const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const refreshToken = String(process.env.GMAIL_API_REFRESH_TOKEN || "").trim();

  return Boolean(accessToken || (clientId && clientSecret && refreshToken));
}

async function getGmailAccessToken() {
  const directToken = String(process.env.GMAIL_API_ACCESS_TOKEN || "").trim();
  if (directToken) {
    return directToken;
  }

  const now = Date.now();
  if (gmailTokenCache.accessToken && gmailTokenCache.expiresAt > now + 30000) {
    return gmailTokenCache.accessToken;
  }

  const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const refreshToken = String(process.env.GMAIL_API_REFRESH_TOKEN || "").trim();

  if (!clientId || !clientSecret || !refreshToken) {
    return "";
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || `Gmail token request failed (${res.status})`);
  }

  gmailTokenCache = {
    accessToken: String(payload.access_token),
    expiresAt: now + (Number(payload.expires_in || 3600) * 1000)
  };

  return gmailTokenCache.accessToken;
}

function encodeBase64Url(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildRawMimeMessage(opts) {
  const from = opts.from || process.env.SMTP_FROM || process.env.SMTP_USER || "JobPortal <no-reply@localhost>";
  const lines = [
    `From: ${from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject || "JobPortal notification"}`,
    "MIME-Version: 1.0"
  ];

  if (opts.html) {
    const boundary = `jobportal-${Date.now()}`;
    lines.push(`Content-Type: multipart/alternative; boundary=\"${boundary}\"`, "", `--${boundary}`);
    lines.push("Content-Type: text/plain; charset=UTF-8", "", opts.text || "");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8", "", opts.html);
    lines.push(`--${boundary}--`);
  } else {
    lines.push("Content-Type: text/plain; charset=UTF-8", "", opts.text || "");
  }

  return lines.join("\r\n");
}

async function sendViaGmailApi(opts) {
  const accessToken = await getGmailAccessToken();
  if (!accessToken) {
    throw new Error("Gmail API credentials are not configured");
  }

  const raw = encodeBase64Url(buildRawMimeMessage(opts));
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw })
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error?.message || `Gmail API send failed (${res.status})`);
  }

  return payload;
}

/**
 * Send an email. Silently skips if SMTP is not configured.
 * @param {object} opts - { to, subject, html, text }
 */
async function sendMail(opts) {
  const message = {
    from: opts.from || process.env.SMTP_FROM || process.env.SMTP_USER,
    to: opts.to,
    subject: opts.subject,
    html: opts.html || undefined,
    text: opts.text || undefined
  };

  const smtpTransporter = getSmtpTransporter();
  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail(message);
      return { provider: "smtp" };
    } catch (err) {
      console.warn("[mailer] SMTP send failed, trying Gmail API fallback if configured:", err.message);
    }
  }

  if (hasGmailApiConfig()) {
    try {
      await sendViaGmailApi(message);
      return { provider: "gmail-api" };
    } catch (err) {
      console.error("[mailer] Gmail API send failed:", err.message);
      return null;
    }
  }

  console.warn("[mailer] No SMTP or Gmail API mail transport configured — skipping email to", opts.to);
  return null;
}

module.exports = { sendMail };
