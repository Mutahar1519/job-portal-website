require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./config/mysql");
const requestId = require("./middleware/requestId");
const paymentsWebhookRoutes = require("./routes/paymentsWebhook");

const app = express();

const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || "development";
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 300);
const CORS_ORIGINS = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isLocalDevOrigin = (origin) => {
  try {
    const parsed = new URL(origin);
    return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(parsed.hostname);
  } catch (err) {
    return false;
  }
};

if (NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(requestId);

// Basic security headers without extra dependencies.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// Simple in-memory IP rate limiter.
const requestBuckets = new Map();
app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const bucket = requestBuckets.get(ip);

  if (!bucket || now - bucket.start > RATE_LIMIT_WINDOW_MS) {
    requestBuckets.set(ip, { count: 1, start: now });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ message: "Too many requests, please try again later." });
  }

  return next();
});

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server and same-origin calls with no Origin header.
      if (!origin) return callback(null, true);

      // Allow file:// pages in development (browser sends Origin: null).
      if (origin === "null" && NODE_ENV !== "production") return callback(null, true);

      // In local development, allow frontends served from any localhost port.
      if (NODE_ENV !== "production" && isLocalDevOrigin(origin)) return callback(null, true);

      if (!CORS_ORIGINS.length) {
        if (NODE_ENV !== "production") return callback(null, true);
        return callback(new Error("CORS blocked"));
      }

      return CORS_ORIGINS.includes(origin)
        ? callback(null, true)
        : callback(new Error("CORS blocked"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  })
);

// Stripe webhook must receive raw body for signature verification.
app.use("/api/payments", paymentsWebhookRoutes);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

const runSchemaChecks = async () => {
  try {
    const requiredUsersColumns = ["role", "phone", "country", "city"];
    const usersColumns = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
    );
    const usersColumnSet = new Set(usersColumns.map((row) => row.COLUMN_NAME));
    const missingUserColumns = requiredUsersColumns.filter((col) => !usersColumnSet.has(col));

    if (missingUserColumns.length) {
      console.warn(
        `⚠️ Missing users columns: ${missingUserColumns.join(", ")}. Run backend/sql/users-profiles.sql to add them.`
      );
    }

    const requiredTables = [
      "job_seeker_profiles",
      "employer_profiles",
      "email_verifications",
      "password_resets",
      "companies",
      "platform_settings"
    ];
    const tableRows = await query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)",
      [requiredTables]
    );
    const tableSet = new Set(tableRows.map((row) => row.TABLE_NAME));
    const missingTables = requiredTables.filter((name) => !tableSet.has(name));

    if (missingTables.length) {
      console.warn(
        `⚠️ Missing tables: ${missingTables.join(", ")}. Run backend/sql/users-profiles.sql and backend/sql/feature-upgrades.sql.`
      );
    }
  } catch (err) {
    console.warn("⚠️ Schema check failed:", err.message);
  }
};

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
const jobsRoutes = require("./routes/jobs");
const usersRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const applicationsRoutes = require("./routes/applications");
const chatRoutes = require("./routes/chat");
const paymentsRoutes = require("./routes/payments");
const reviewsRoutes = require("./routes/reviews");
const companiesRoutes = require("./routes/companies");
const savedJobsRoutes = require("./routes/savedJobs");
const jobAlertsRoutes = require("./routes/jobAlerts");
const resumesRoutes = require("./routes/resumes");
const messagesRoutes = require("./routes/messages");
const employerRoutes = require("./routes/employer");
const shiftsRoutes = require("./routes/shifts");
const authRoutes = require("./routes/auth");

app.use("/api/jobs", jobsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/saved-jobs", savedJobsRoutes);
app.use("/api/job-alerts", jobAlertsRoutes);
app.use("/api/resumes", resumesRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/employer", employerRoutes);
app.use("/api/shifts", shiftsRoutes);
app.use("/api/auth", authRoutes);

runSchemaChecks();

app.get("/api/health", async (req, res) => {
  try {
    await query("SELECT 1 AS ok");
    return res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      database: "disconnected",
      message: err.message
    });
  }
});

// serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/favicon.svg"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "Not found" });
  }

  res.status(404).sendFile(path.join(__dirname, "../frontend/404.html"));
});

app.use((err, req, res, next) => {
  console.error(`[${req.requestId || "no-request-id"}]`, err);
  if (req.path.startsWith("/api")) {
    return res.status(500).json({
      message: "Server error",
      requestId: req.requestId || null
    });
  }
  res.status(500).sendFile(path.join(__dirname, "../frontend/500.html"));
});

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

let shuttingDown = false;

const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n[shutdown] Received ${signal}. Closing server...`);
  server.close(() => {
    console.log("[shutdown] HTTP server closed.");
    db.end((dbErr) => {
      if (dbErr) {
        console.error("[shutdown] Error while closing DB pool:", dbErr.message);
        process.exit(1);
      }
      console.log("[shutdown] DB pool closed.");
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error("[shutdown] Forced exit after timeout.");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  console.error("[fatal] uncaughtException:", err);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("[fatal] unhandledRejection:", reason);
  shutdown("unhandledRejection");
});
