const db = require("../config/mysql");
const { sendMail } = require("../utils/mailer");

const NOTIFICATION_COLUMN_MAP = {
  job_alert_match: "job_alert_emails",
  application_status_update: "application_update_emails",
  support_reply: "support_reply_emails",
  saved_job_updated: "saved_job_update_emails",
  promotional: "promotional_emails"
};

// Get user notification preferences
const getNotificationPreferences = (req, res) => {
  const userId = req.user.id;

  db.query(
    "SELECT * FROM user_notification_preferences WHERE user_id = ?",
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      // Return default preferences if not found
      if (!rows.length) {
        return res.json({
          user_id: userId,
          job_alert_emails: true,
          application_update_emails: true,
          support_reply_emails: true,
          saved_job_update_emails: true,
          promotional_emails: false,
          email_frequency: "immediate",
          unsubscribed_from_all: false
        });
      }

      res.json(rows[0]);
    }
  );
};

// Update user notification preferences
const updateNotificationPreferences = (req, res) => {
  const userId = req.user.id;
  const {
    job_alert_emails,
    application_update_emails,
    support_reply_emails,
    saved_job_update_emails,
    promotional_emails,
    email_frequency,
    unsubscribed_from_all
  } = req.body;

  // Create or update record
  const sql = `
    INSERT INTO user_notification_preferences 
    (user_id, job_alert_emails, application_update_emails, support_reply_emails, 
     saved_job_update_emails, promotional_emails, email_frequency, unsubscribed_from_all)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      job_alert_emails = VALUES(job_alert_emails),
      application_update_emails = VALUES(application_update_emails),
      support_reply_emails = VALUES(support_reply_emails),
      saved_job_update_emails = VALUES(saved_job_update_emails),
      promotional_emails = VALUES(promotional_emails),
      email_frequency = VALUES(email_frequency),
      unsubscribed_from_all = VALUES(unsubscribed_from_all)
  `;

  db.query(
    sql,
    [
      userId,
      job_alert_emails !== undefined ? job_alert_emails : true,
      application_update_emails !== undefined ? application_update_emails : true,
      support_reply_emails !== undefined ? support_reply_emails : true,
      saved_job_update_emails !== undefined ? saved_job_update_emails : true,
      promotional_emails !== undefined ? promotional_emails : false,
      email_frequency || "immediate",
      unsubscribed_from_all !== undefined ? unsubscribed_from_all : false
    ],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Notification preferences updated" });
    }
  );
};

// Send email notification (internal helper)
const sendEmailNotification = async (
  userId,
  recipientEmail,
  emailType,
  subject,
  templateData
) => {
  try {
    await sendMail({
      to: recipientEmail,
      subject: subject,
      html: renderEmailTemplate(emailType, templateData),
      text: renderEmailTemplate(emailType, templateData, true)
    });

    // Log success in database
    db.query(
      `INSERT INTO email_notifications 
       (user_id, recipient_email, email_type, subject, template_name, template_data, status)
       VALUES (?, ?, ?, ?, ?, ?, 'sent')`,
      [userId, recipientEmail, emailType, subject, emailType, JSON.stringify(templateData)],
      (dbErr) => {
        if (dbErr) console.error("[Email] Database log failed:", dbErr.message);
      }
    );

    return { status: "sent", email: recipientEmail };
  } catch (err) {
    // Log failure
    db.query(
      `INSERT INTO email_notifications 
       (user_id, recipient_email, email_type, subject, template_name, status, error_message)
       VALUES (?, ?, ?, ?, ?, 'failed', ?)`,
      [userId, recipientEmail, emailType, subject, emailType, err.message],
      (dbErr) => {
        if (dbErr) console.error("[Email] Database log failed:", dbErr.message);
      }
    );

    throw err;
  }
};

// Render email template with variables
const renderEmailTemplate = (emailType, data = {}, plaintext = false) => {
  const templates = {
    job_alert_match: () =>
      `<h2>${data.jobTitle || "New Job"}</h2>
       <p>A job matching your alerts has been posted in ${data.location || "your area"}.</p>
       <p><strong>Company:</strong> ${data.companyName || "Unknown"}</p>
       <p><strong>Salary:</strong> ${data.salary || "Competitive"}</p>
       <p><a href="${data.jobUrl || "#"}">View Job Details</a></p>`,

    application_status_update: () =>
      `<p>Your application for <strong>${
        data.jobTitle || "a position"
      }</strong> has been updated.</p>
       <p><strong>New Status:</strong> ${data.status || "Updated"}</p>
       <p>${data.message || ""}</p>
       <p><a href="${data.applicationUrl || "#"}">View Your Application</a></p>`,

    support_reply: () =>
      `<p>There's a new reply to your support ticket #${data.ticketId || ""}</p>
       <p><strong>From:</strong> ${data.replierName || "Support Team"}</p>
       <p><strong>Message Preview:</strong></p>
       <p>${data.replyPreview || data.message || ""}</p>
       <p><a href="${data.ticketUrl || "#"}">View Full Conversation</a></p>`,

    saved_job_updated: () =>
      `<p>A job you saved has been updated!</p>
       <p><strong>Job:</strong> ${data.jobTitle || "Unknown"}</p>
       <p><strong>What Changed:</strong> ${data.changeDescription || "Job details were updated"}</p>
       <p><a href="${data.jobUrl || "#"}">View Updated Job</a></p>`,

    job_expiring_soon: () =>
      `<p>Your job posting will expire in ${data.daysUntilExpiry || 7} days.</p>
       <p><strong>Job:</strong> ${data.jobTitle || "Unknown"}</p>
       <p><a href="${data.renewUrl || "#"}">Renew Now</a></p>`,

    referral_notification: () =>
      `<p>Your referral <strong>${data.referralName || "Someone"}</strong> was hired!</p>
       <p><strong>Reward:</strong> ${data.rewardAmount || "Credit earned"}</p>
       <p><a href="${data.rewardsUrl || "#"}">View Your Rewards</a></p>`,

    password_reset: () =>
      `<p>Click the link below to reset your password. This link expires in 1 hour.</p>
       <p><a href="${data.resetUrl || "#"}">Reset Password</a></p>`,

    email_verification: () =>
      `<p>Click the link below to verify your email address.</p>
       <p><a href="${data.verificationUrl || "#"}">Verify Email</a></p>`
  };

  const template = templates[emailType] || (() => "Email notification");
  const html = template();

  if (plaintext) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          h2 { color: #0066cc; }
          a { color: #0066cc; text-decoration: none; }
          .footer { color: #888; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        ${html}
        <div class="footer">
          <p>You received this email because you're using JobPortal.</p>
          <p><a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/notifications-settings.html">Manage email preferences</a></p>
        </div>
      </body>
    </html>
  `;
};

// Send job alert email
const sendJobAlertEmail = async (userId, userEmail, jobId, job) => {
  return sendEmailNotification(userId, userEmail, "job_alert_match", `New Job: ${job.title}`, {
    jobTitle: job.title,
    location: job.location || "Remote",
    companyName: job.company_name || "Unknown",
    salary: job.salary_min ? `$${job.salary_min}` : "Competitive",
    jobUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/job.html?id=${jobId}`
  });
};

// Send application status update email
const sendApplicationUpdateEmail = async (userId, userEmail, jobTitle, appUrl, status) => {
  const statusMessages = {
    pending: "Your application is being reviewed",
    reviewed: "Your application has been reviewed",
    accepted: "Congratulations! Your application was accepted",
    rejected: "Unfortunately, your application was not selected",
    new_application: "A new candidate has applied to your job posting"
  };

  return sendEmailNotification(
    userId,
    userEmail,
    "application_status_update",
    `Your application for ${jobTitle}`,
    {
      jobTitle: jobTitle,
      status: status,
      message: statusMessages[status] || "Your application status has changed",
      applicationUrl: appUrl
    }
  );
};

// Send support ticket reply notification
const sendSupportReplyEmail = async (userId, userEmail, ticketId, replierName, message) => {
  return sendEmailNotification(
    userId,
    userEmail,
    "support_reply",
    `New reply to your support ticket #${ticketId}`,
    {
      ticketId: ticketId,
      replierName: replierName,
      replyPreview: message.substring(0, 150) + "...",
      message: message,
      ticketUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard.html`
    }
  );
};

const canSendNotification = (userId, notificationType, callback) => {
  const mappedColumn = NOTIFICATION_COLUMN_MAP[notificationType];

  if (!mappedColumn) return callback(null, true);

  db.query(
    `SELECT unsubscribed_from_all, ${mappedColumn} AS enabled
     FROM user_notification_preferences
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
    (err, rows) => {
      if (err) return callback(err);

      if (!rows.length) return callback(null, true);

      const prefs = rows[0];
      if (Number(prefs.unsubscribed_from_all) === 1) {
        return callback(null, false);
      }

      callback(null, Number(prefs.enabled) === 1);
    }
  );
};

module.exports = {
  getNotificationPreferences,
  updateNotificationPreferences,
  sendEmailNotification,
  sendJobAlertEmail,
  sendApplicationUpdateEmail,
  sendSupportReplyEmail,
  renderEmailTemplate,
  canSendNotification
};
