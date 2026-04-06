const HF_API_URL = "https://router.huggingface.co/";
const HF_MODEL = process.env.HUGGINGFACE_MODEL || "microsoft/DialoGPT-medium";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openchat/openchat-3.5-0106";
const callOpenRouter = async (message) => {
  if (!OPENROUTER_API_KEY) return null;
  // System prompt to guide users to generate a support ticket for human support
  const systemPrompt = "You are an assistant for a job portal website. If a user asks for human support, tell them: 'To contact human support, please generate a support ticket in the portal and wait for a reply.'";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errText}`);
  }
  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content;
  return reply ? reply.trim() : null;
};
const LIVE_SUPPORT_QUEUE_LIMIT = 100;
const liveSupportRequests = [];
const db = require("../config/mysql");
const {
  canSendNotification,
  sendSupportReplyEmail
} = require("./notificationsController");

let realtimeIo = null;

exports.setRealtimeEmitter = (io) => {
  realtimeIo = io;
};

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

const maskEmail = (value) => {
  const email = String(value || "").trim();
  const at = email.indexOf("@");
  if (at <= 1) return email || "";

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain) return `${local[0]}***`;

  return `${local[0]}***@${domain}`;
};

const toSafeMessagePreview = (value, maxLen = 120) => {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";

  const redactedEmail = raw.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
  const redactedPhone = redactedEmail.replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]");
  return redactedPhone.length > maxLen ? `${redactedPhone.slice(0, maxLen - 1)}…` : redactedPhone;
};

const isMissingLastReplyColumnError = (err) => {
  const message = String(err?.message || "");
  return err?.code === "ER_BAD_FIELD_ERROR" && /last_replied_admin_id/i.test(message);
};

const runSupportQuery = async (primarySql, fallbackSql, params = []) => {
  try {
    return await query(primarySql, params);
  } catch (err) {
    if (fallbackSql && isMissingLastReplyColumnError(err)) {
      return query(fallbackSql, params);
    }
    throw err;
  }
};

const runSupportUpdate = async (primarySql, fallbackSql, primaryParams = [], fallbackParams = primaryParams) => {
  try {
    return await query(primarySql, primaryParams);
  } catch (err) {
    if (fallbackSql && isMissingLastReplyColumnError(err)) {
      return query(fallbackSql, fallbackParams);
    }
    throw err;
  }
};

const supportTicketSelectPrimary = `t.ticket_id, t.user_id, t.user_email, t.status, t.created_at, t.updated_at,
           t.unread_user_count, t.unread_admin_count, t.assigned_admin_id, t.last_replied_admin_id,
           assigned.name AS assigned_admin_name,
           replied.name AS last_replied_admin_name`;

const supportTicketSelectFallback = `t.ticket_id, t.user_id, t.user_email, t.status, t.created_at, t.updated_at,
           t.unread_user_count, t.unread_admin_count, t.assigned_admin_id, NULL AS last_replied_admin_id,
           assigned.name AS assigned_admin_name,
           NULL AS last_replied_admin_name`;

const supportTicketUserListSelectPrimary = `t.ticket_id, t.status, t.created_at, t.updated_at,
              t.unread_user_count, t.unread_admin_count, t.assigned_admin_id, t.last_replied_admin_id,
              assigned.name AS assigned_admin_name,
              replied.name AS last_replied_admin_name,
              (SELECT m.message FROM support_messages m WHERE m.ticket_id = t.ticket_id ORDER BY m.id DESC LIMIT 1) AS last_message,
              (SELECT m.sender_type FROM support_messages m WHERE m.ticket_id = t.ticket_id ORDER BY m.id DESC LIMIT 1) AS last_sender`;

const supportTicketUserListSelectFallback = `t.ticket_id, t.status, t.created_at, t.updated_at,
              t.unread_user_count, t.unread_admin_count, t.assigned_admin_id, NULL AS last_replied_admin_id,
              assigned.name AS assigned_admin_name,
              NULL AS last_replied_admin_name,
              (SELECT m.message FROM support_messages m WHERE m.ticket_id = t.ticket_id ORDER BY m.id DESC LIMIT 1) AS last_message,
              (SELECT m.sender_type FROM support_messages m WHERE m.ticket_id = t.ticket_id ORDER BY m.id DESC LIMIT 1) AS last_sender`;

const supportTicketAdminListSelectPrimary = `t.ticket_id, t.user_id, t.user_name, t.user_email, t.page, t.status, t.created_at, t.updated_at,
              t.unread_user_count, t.unread_admin_count, t.assigned_admin_id, t.last_replied_admin_id,
              assigned.name AS assigned_admin_name,
              replied.name AS last_replied_admin_name,
              (SELECT m.message FROM support_messages m WHERE m.ticket_id = t.ticket_id ORDER BY m.id DESC LIMIT 1) AS last_message,
              (SELECT m.sender_type FROM support_messages m WHERE m.ticket_id = t.ticket_id ORDER BY m.id DESC LIMIT 1) AS last_sender`;

const supportTicketAdminListSelectFallback = `t.ticket_id, t.user_id, t.user_name, t.user_email, t.page, t.status, t.created_at, t.updated_at,
              t.unread_user_count, t.unread_admin_count, t.assigned_admin_id, NULL AS last_replied_admin_id,
              assigned.name AS assigned_admin_name,
              NULL AS last_replied_admin_name,
              (SELECT m.message FROM support_messages m WHERE m.ticket_id = t.ticket_id ORDER BY m.id DESC LIMIT 1) AS last_message,
              (SELECT m.sender_type FROM support_messages m WHERE m.ticket_id = t.ticket_id ORDER BY m.id DESC LIMIT 1) AS last_sender`;

const supportTicketJoinsPrimary = `LEFT JOIN users assigned ON assigned.id = t.assigned_admin_id
     LEFT JOIN users replied ON replied.id = t.last_replied_admin_id`;

const supportTicketJoinsFallback = `LEFT JOIN users assigned ON assigned.id = t.assigned_admin_id`;

const bootstrapSupportSchema = () => {
  db.query(
    `CREATE TABLE IF NOT EXISTS support_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id VARCHAR(40) NOT NULL UNIQUE,
      user_id INT NULL,
      user_name VARCHAR(150) NULL,
      user_email VARCHAR(255) NULL,
      page VARCHAR(255) NULL,
      status ENUM('open', 'waiting_user', 'waiting_support', 'closed') NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_support_tickets_user (user_id),
      INDEX idx_support_tickets_status (status),
      INDEX idx_support_tickets_created (created_at)
    )`,
    (err) => {
      if (err) {
        console.warn("support_tickets bootstrap failed:", err.message);
      }
    }
  );

  const alters = [
    "ALTER TABLE support_tickets ADD COLUMN assigned_admin_id INT NULL",
    "ALTER TABLE support_tickets ADD COLUMN last_replied_admin_id INT NULL",
    "ALTER TABLE support_tickets ADD COLUMN unread_user_count INT NOT NULL DEFAULT 0",
    "ALTER TABLE support_tickets ADD COLUMN unread_admin_count INT NOT NULL DEFAULT 0",
    "ALTER TABLE support_tickets ADD INDEX idx_support_tickets_assigned_admin (assigned_admin_id)",
    "ALTER TABLE support_tickets ADD INDEX idx_support_tickets_last_replied_admin (last_replied_admin_id)"
  ];

  const runAlter = (index = 0) => {
    if (index >= alters.length) return;
    db.query(alters[index], (err) => {
      if (err && err.code !== "ER_DUP_FIELDNAME" && err.code !== "ER_DUP_KEYNAME") {
        console.warn("support_tickets alter failed:", err.message);
      }
      runAlter(index + 1);
    });
  };

  runAlter();

  db.query(
    `CREATE TABLE IF NOT EXISTS support_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id VARCHAR(40) NOT NULL,
      sender_type ENUM('user', 'support', 'system') NOT NULL,
      sender_id INT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_support_messages_ticket (ticket_id),
      INDEX idx_support_messages_created (created_at)
    )`,
    (err) => {
      if (err) {
        console.warn("support_messages bootstrap failed:", err.message);
      }
    }
  );
};

bootstrapSupportSchema();

const emitRealtime = (event, payload) => {
  if (!realtimeIo) return;

  if (payload?.ticketId) {
    realtimeIo.to(`support-ticket:${payload.ticketId}`).emit(event, payload);
  }

  if (payload?.userId) {
    realtimeIo.to(`support-user:${payload.userId}`).emit(event, payload);
  }

  realtimeIo.to("support-admin").emit(event, payload);
};

const buildFallbackReply = (message) => {
  const msg = (message || "").toLowerCase();
  // Custom support ticket override for human support requests
  if (
    msg.includes("human support") ||
    msg.includes("real person") ||
    msg.includes("talk to human") ||
    msg.includes("talk to a human") ||
    msg.includes("live agent") ||
    msg.includes("customer service representative") ||
    msg.includes("speak to agent") ||
    msg.includes("speak to a person")
  ) {
    return "To contact human support, please generate a support ticket in the portal and wait for a reply from our team.";
  }

  let reply = "I can help with jobs, applications, payments, and profile questions. Try asking about apply, post job, payment status, or support.";

  if (msg.includes("apply")) {
    reply = "To apply for a job, open a listing and click Apply. You can upload your CV (PDF).";
  } else if (msg.includes("post job") || msg.includes("post a job")) {
    reply = "Only admin-verified employers with an admin-verified company can post jobs. Once both are approved, use Post Job from the dashboard.";
  } else if (msg.includes("premium")) {
    reply = "Premium jobs appear at the top and get more visibility for a limited time.";
  } else if (msg.includes("payment") && (msg.includes("stuck") || msg.includes("failed") || msg.includes("pending"))) {
    reply = "If a payment is stuck, check your dashboard for status, wait a few minutes, then retry. If charged but not updated, contact support@jobportal.com with the email and time.";
  } else if (msg.includes("payment")) {
    reply = "Payments are handled from the checkout screen. You can see status in your dashboard under Billing.";
  } else if (msg.includes("application") && msg.includes("status")) {
    reply = "Open your Dashboard and go to Applications to see the latest status for each job.";
  } else if (msg.includes("profile") || msg.includes("user info") || msg.includes("my info")) {
    reply = "For account details, open your Profile page while signed in. I do not have access to personal data.";
  } else if (msg.includes("contact") || msg.includes("support")) {
    reply = "You can contact support via email: support@jobportal.com";
  } else if (msg.includes("register") || msg.includes("sign up")) {
    reply = "You can register using the signup form on the website.";
  } else if (msg.includes("what are you doing here")) {
    reply = "I am here to help with jobs, applications, payments, and account questions.";
  }

  return reply;
};


const callHuggingFace = async (message) => {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      inputs: message,
      model: HF_MODEL
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HuggingFace error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const generated = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
  if (!generated) return null;
  const trimmed = generated.startsWith(message) ? generated.slice(message.length).trim() : generated.trim();
  return trimmed || null;
};

exports.chatBot = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.json({ reply: "Please ask a question." });
  }

  // Try OpenRouter first if configured
  if (OPENROUTER_API_KEY) {
    try {
      const orReply = await callOpenRouter(message);
      console.log("[DEBUG] OpenRouter raw reply:", orReply);
      if (orReply) {
        return res.json({ reply: orReply });
      }
    } catch (err) {
      console.error("[DEBUG] OpenRouter chat error:", err.message);
    }
  }

  // Fallback to HuggingFace if configured
  if (process.env.HUGGINGFACE_API_KEY) {
    try {
      const hfReply = await callHuggingFace(message);
      console.log("[DEBUG] HuggingFace raw reply:", hfReply);
      if (hfReply) {
        return res.json({ reply: hfReply });
      }
    } catch (err) {
      console.error("[DEBUG] HuggingFace chat error:", err.message);
    }
  }

  // Fallback to rule-based reply
  const reply = buildFallbackReply(message);
  return res.json({ reply });
};

exports.getChatStatus = (_req, res) => {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasHuggingFace = Boolean(process.env.HUGGINGFACE_API_KEY);
  const provider = hasOpenAI ? "openai" : hasHuggingFace ? "huggingface" : "fallback";
  const model = hasOpenAI ? OPENAI_MODEL : hasHuggingFace ? HF_MODEL : "rule-based";

  return res.json({
    aiEnabled: hasOpenAI || hasHuggingFace,
    provider,
    model,
    liveSupport: true,
    realtime: Boolean(realtimeIo)
  });
};

const canAccessTicket = async (ticketId, reqUser) => {
  const rows = await runSupportQuery(
    `SELECT ${supportTicketSelectPrimary}
     FROM support_tickets t
     ${supportTicketJoinsPrimary}
     WHERE t.ticket_id = ?
     LIMIT 1`,
    `SELECT ${supportTicketSelectFallback}
     FROM support_tickets t
     ${supportTicketJoinsFallback}
     WHERE t.ticket_id = ?
     LIMIT 1`,
    [ticketId]
  );

  if (!rows.length) {
    return { ok: false, code: 404, message: "Ticket not found" };
  }

  const ticket = rows[0];
  if (reqUser?.is_admin) {
    return { ok: true, ticket };
  }

  if (!reqUser?.id) {
    return { ok: false, code: 401, message: "Login required" };
  }

  if (Number(ticket.user_id) !== Number(reqUser.id)) {
    return { ok: false, code: 403, message: "Not allowed to access this ticket" };
  }

  return { ok: true, ticket };
};

exports.requestLiveSupport = async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const transcript = Array.isArray(req.body?.transcript) ? req.body.transcript : [];

  if (!req.user?.id) {
    return res.status(401).json({ message: "Please login first to start a human support chat." });
  }

  if (!message) {
    return res.status(400).json({ message: "Support message is required." });
  }

  const ticketId = `SUP-${Date.now()}`;
  liveSupportRequests.unshift({
    ticketId,
    message,
    transcript: transcript.slice(-10),
    page: String(req.body?.page || ""),
    createdAt: new Date().toISOString()
  });

  if (liveSupportRequests.length > LIVE_SUPPORT_QUEUE_LIMIT) {
    liveSupportRequests.length = LIVE_SUPPORT_QUEUE_LIMIT;
  }

  const userEmail = String(req.body?.email || req.user?.email || "").trim() || null;
  const userName = String(req.body?.name || req.user?.name || "").trim() || null;
  const userId = Number.isFinite(Number(req.user?.id)) ? Number(req.user.id) : null;
  const page = String(req.body?.page || "").trim() || null;

  try {
    await query(
      `INSERT INTO support_tickets (ticket_id, user_id, user_name, user_email, page, status, unread_user_count, unread_admin_count)
       VALUES (?, ?, ?, ?, ?, 'open', 0, 1)`,
      [ticketId, userId, userName, userEmail, page]
    );

    await query(
      `INSERT INTO support_messages (ticket_id, sender_type, sender_id, message)
       VALUES (?, 'user', ?, ?)`,
      [ticketId, userId, message]
    );

    if (transcript.length) {
      const summary = transcript
        .slice(-10)
        .map((item) => `${item?.role || "unknown"}: ${item?.text || ""}`)
        .join("\n")
        .trim();
      if (summary) {
        await query(
          `INSERT INTO support_messages (ticket_id, sender_type, sender_id, message)
           VALUES (?, 'system', NULL, ?)`,
          [ticketId, `Recent AI transcript:\n${summary}`]
        );
      }
    }

    emitRealtime("support:ticket-updated", { ticketId, userId, action: "created" });

    return res.json({
      ok: true,
      ticketId,
      reply: `Live support request received. Ticket ${ticketId} was created. You can continue here and our support team will reply in this chat.`
    });
  } catch (err) {
    console.error("Live support ticket create error:", err.message);
    return res.status(500).json({ message: "Unable to create live support ticket right now." });
  }
};

exports.getMySupportTickets = async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Login required" });
  }

  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);

  try {
    const tickets = await runSupportQuery(
      `SELECT ${supportTicketUserListSelectPrimary}
       FROM support_tickets t
       ${supportTicketJoinsPrimary}
       WHERE t.user_id = ?
       ORDER BY t.updated_at DESC
       LIMIT ?`,
      `SELECT ${supportTicketUserListSelectFallback}
       FROM support_tickets t
       ${supportTicketJoinsFallback}
       WHERE t.user_id = ?
       ORDER BY t.updated_at DESC
       LIMIT ?`,
      [Number(req.user.id), limit]
    );

    const sanitizedTickets = (tickets || []).map((ticket) => ({
      ...ticket,
      user_email_masked: maskEmail(ticket.user_email),
      last_message_preview: toSafeMessagePreview(ticket.last_message),
      user_email: undefined,
      last_message: undefined
    }));

    return res.json(sanitizedTickets);
  } catch (err) {
    console.error("getMySupportTickets error:", err.message);
    return res.status(500).json({ message: "Failed to load support tickets" });
  }
};

exports.getAdminSupportTickets = async (req, res) => {
  const status = String(req.query.status || "open").trim().toLowerCase();
  const mineOnly = String(req.query.mine || "").trim() === "1";
  const allowed = new Set(["open", "waiting_user", "waiting_support", "closed", "all"]);
  if (!allowed.has(status)) {
    return res.status(400).json({ message: "Invalid status filter" });
  }

  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 200);

  try {
    const where = [];
    const params = [];
    if (status !== "all") {
      where.push("t.status = ?");
      params.push(status);
    }
    if (mineOnly) {
      where.push("t.assigned_admin_id = ?");
      params.push(Number(req.user.id));
    }

    const whereClause = where.length ? where.join(" AND ") : "1=1";
    params.push(limit);

    const tickets = await runSupportQuery(
      `SELECT ${supportTicketAdminListSelectPrimary}
       FROM support_tickets t
       ${supportTicketJoinsPrimary}
       WHERE ${whereClause}
       ORDER BY t.unread_admin_count DESC,
                FIELD(t.status, 'open', 'waiting_support', 'waiting_user', 'closed'),
                t.updated_at DESC
       LIMIT ?`,
      `SELECT ${supportTicketAdminListSelectFallback}
       FROM support_tickets t
       ${supportTicketJoinsFallback}
       WHERE ${whereClause}
       ORDER BY t.unread_admin_count DESC,
                FIELD(t.status, 'open', 'waiting_support', 'waiting_user', 'closed'),
                t.updated_at DESC
       LIMIT ?`,
      params
    );

    return res.json((tickets || []).map((ticket) => ({
      ...ticket,
      user_email_masked: maskEmail(ticket.user_email),
      last_message_preview: toSafeMessagePreview(ticket.last_message),
      user_email: undefined,
      last_message: undefined
    })));
  } catch (err) {
    console.error("getAdminSupportTickets error:", err.message);
    return res.status(500).json({ message: "Failed to load support tickets" });
  }
};

exports.getTicketMessages = async (req, res) => {
  const ticketId = String(req.params.ticketId || "").trim();
  if (!ticketId) return res.status(400).json({ message: "Ticket id is required" });

  try {
    const access = await canAccessTicket(ticketId, req.user);
    if (!access.ok) return res.status(access.code).json({ message: access.message });

    const messages = await query(
      `SELECT m.id, m.ticket_id, m.sender_type, m.sender_id, m.message, m.created_at,
              u.name AS sender_name
       FROM support_messages m
       LEFT JOIN users u ON u.id = m.sender_id
       WHERE ticket_id = ?
       ORDER BY m.id ASC`,
      [ticketId]
    );

    if (req.user?.is_admin) {
      await query("UPDATE support_tickets SET unread_admin_count = 0 WHERE ticket_id = ?", [ticketId]);
    } else {
      await query("UPDATE support_tickets SET unread_user_count = 0 WHERE ticket_id = ?", [ticketId]);
    }

    emitRealtime("support:ticket-updated", {
      ticketId,
      userId: access.ticket.user_id,
      action: "read",
      by: req.user?.is_admin ? "admin" : "user"
    });

    return res.json({ ticket: access.ticket, messages });
  } catch (err) {
    console.error("getTicketMessages error:", err.message);
    return res.status(500).json({ message: "Failed to load ticket messages" });
  }
};

exports.sendTicketMessage = async (req, res) => {
  const ticketId = String(req.params.ticketId || "").trim();
  const message = String(req.body?.message || "").trim();

  if (!ticketId) return res.status(400).json({ message: "Ticket id is required" });
  if (!message) return res.status(400).json({ message: "Message is required" });

  try {
    const access = await canAccessTicket(ticketId, req.user);
    if (!access.ok) return res.status(access.code).json({ message: access.message });
    if (access.ticket.status === "closed") {
      return res.status(400).json({ message: "Ticket is closed" });
    }

    const senderType = req.user?.is_admin ? "support" : "user";
    const senderId = Number.isFinite(Number(req.user?.id)) ? Number(req.user.id) : null;
    const nextStatus = req.user?.is_admin ? "waiting_user" : "waiting_support";

    await query(
      `INSERT INTO support_messages (ticket_id, sender_type, sender_id, message)
       VALUES (?, ?, ?, ?)`,
      [ticketId, senderType, senderId, message]
    );

    await runSupportUpdate(
      `UPDATE support_tickets
       SET status = ?,
           unread_user_count = CASE WHEN ? = 'support' THEN unread_user_count + 1 ELSE 0 END,
           unread_admin_count = CASE WHEN ? = 'user' THEN unread_admin_count + 1 ELSE 0 END,
           assigned_admin_id = CASE WHEN ? = 'support' AND assigned_admin_id IS NULL THEN ? ELSE assigned_admin_id END,
           last_replied_admin_id = CASE WHEN ? = 'support' THEN ? ELSE last_replied_admin_id END,
           updated_at = NOW()
       WHERE ticket_id = ?`,
      `UPDATE support_tickets
       SET status = ?,
           unread_user_count = CASE WHEN ? = 'support' THEN unread_user_count + 1 ELSE 0 END,
           unread_admin_count = CASE WHEN ? = 'user' THEN unread_admin_count + 1 ELSE 0 END,
           assigned_admin_id = CASE WHEN ? = 'support' AND assigned_admin_id IS NULL THEN ? ELSE assigned_admin_id END,
           updated_at = NOW()
       WHERE ticket_id = ?`,
      [
        nextStatus,
        senderType,
        senderType,
        senderType,
        req.user?.is_admin ? Number(req.user.id) : null,
        senderType,
        req.user?.is_admin ? Number(req.user.id) : null,
        ticketId
      ],
      [
        nextStatus,
        senderType,
        senderType,
        senderType,
        req.user?.is_admin ? Number(req.user.id) : null,
        ticketId
      ]
    );

    emitRealtime("support:new-message", {
      ticketId,
      userId: access.ticket.user_id,
      senderType,
      message,
      status: nextStatus
    });

    if (senderType === "support" && access.ticket.user_id && access.ticket.user_email) {
      canSendNotification(access.ticket.user_id, "support_reply", (prefErr, enabled) => {
        if (prefErr || !enabled) return;

        sendSupportReplyEmail(
          access.ticket.user_id,
          access.ticket.user_email,
          ticketId,
          req.user?.name || "Support Team",
          message
        ).catch((mailErr) => {
          console.warn("[support] reply email send failed:", mailErr.message);
        });
      });
    }

    return res.json({ ok: true, ticketId, status: nextStatus });
  } catch (err) {
    console.error("sendTicketMessage error:", err.message);
    return res.status(500).json({ message: "Failed to send message" });
  }
};

exports.updateTicketStatus = async (req, res) => {
  const ticketId = String(req.params.ticketId || "").trim();
  const status = String(req.body?.status || "").trim().toLowerCase();
  const allowed = new Set(["open", "waiting_user", "waiting_support", "closed"]);

  if (!ticketId) return res.status(400).json({ message: "Ticket id is required" });
  if (!allowed.has(status)) return res.status(400).json({ message: "Invalid status" });

  try {
    const result = await query(
      `UPDATE support_tickets
       SET status = ?, updated_at = NOW()
       WHERE ticket_id = ?`,
      [status, ticketId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    emitRealtime("support:ticket-updated", { ticketId, action: "status", status });
    return res.json({ ok: true, ticketId, status });
  } catch (err) {
    console.error("updateTicketStatus error:", err.message);
    return res.status(500).json({ message: "Failed to update ticket status" });
  }
};

exports.assignTicketAdmin = async (req, res) => {
  const ticketId = String(req.params.ticketId || "").trim();
  const adminIdRaw = req.body?.adminId;
  const adminId = adminIdRaw === null ? null : Number(adminIdRaw || req.user?.id);

  if (!ticketId) return res.status(400).json({ message: "Ticket id is required" });
  if (adminId !== null && !Number.isFinite(adminId)) {
    return res.status(400).json({ message: "Invalid admin id" });
  }

  try {
    if (adminId !== null) {
      const admins = await query("SELECT id FROM users WHERE id = ? AND is_admin = 1 LIMIT 1", [adminId]);
      if (!admins.length) {
        return res.status(400).json({ message: "Admin user not found" });
      }
    }

    const result = await query(
      `UPDATE support_tickets
       SET assigned_admin_id = ?, updated_at = NOW()
       WHERE ticket_id = ?`,
      [adminId, ticketId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    emitRealtime("support:ticket-updated", {
      ticketId,
      action: "assignment",
      assignedAdminId: adminId
    });

    return res.json({ ok: true, ticketId, assignedAdminId: adminId });
  } catch (err) {
    console.error("assignTicketAdmin error:", err.message);
    return res.status(500).json({ message: "Failed to assign ticket" });
  }
};

exports.getSupportUnreadCounts = async (req, res) => {
  try {
    if (req.user?.is_admin) {
      const rows = await query(
        `SELECT
          COALESCE(SUM(unread_admin_count), 0) AS unread,
          COALESCE(SUM(CASE WHEN status IN ('open', 'waiting_support') THEN 1 ELSE 0 END), 0) AS open_tickets
         FROM support_tickets`
      );
      return res.json({ unread: Number(rows[0]?.unread || 0), openTickets: Number(rows[0]?.open_tickets || 0) });
    }

    const rows = await query(
      `SELECT COALESCE(SUM(unread_user_count), 0) AS unread
       FROM support_tickets
       WHERE user_id = ?`,
      [Number(req.user.id)]
    );
    return res.json({ unread: Number(rows[0]?.unread || 0) });
  } catch (err) {
    console.error("getSupportUnreadCounts error:", err.message);
    return res.status(500).json({ message: "Failed to load unread counts" });
  }
};
