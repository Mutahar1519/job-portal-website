const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "noreply@jobportal.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || SMTP_USER || "";

let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  return _transporter;
};

/**
 * Send an email. Silently skips if SMTP is not configured.
 * @param {{ to: string, subject: string, text: string, html?: string }} opts
 */
const sendMail = async ({ to, subject, text, html }) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[MAILER] SMTP not configured. Skipping email to: ${to} — ${subject}`);
    return { skipped: true };
  }
  try {
    return await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text,
      html: html || text
    });
  } catch (err) {
    console.error("[MAILER] Failed to send email:", err.message);
    throw err;
  }
};

module.exports = { sendMail, ADMIN_EMAIL };
