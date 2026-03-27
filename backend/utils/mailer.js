const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587"),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/**
 * Send an email. Silently skips if SMTP is not configured.
 * @param {object} opts - { to, subject, html, text }
 */
async function sendMail(opts) {
  const t = getTransporter();
  if (!t) {
    console.warn("[mailer] SMTP not configured — skipping email to", opts.to);
    return;
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: opts.to,
      subject: opts.subject,
      html: opts.html || undefined,
      text: opts.text || undefined,
    });
  } catch (err) {
    console.error("[mailer] Failed to send email:", err.message);
  }
}

module.exports = { sendMail };
