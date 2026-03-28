const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const http = require("http");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const db = require("./config/mysql");
const chatController = require("./controllers/chatController");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true
  }
});

chatController.setRealtimeEmitter(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    socket.user = null;
    return next();
  }

  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    return next();
  } catch (_err) {
    socket.user = null;
    return next();
  }
});

io.on("connection", (socket) => {
  if (socket.user?.id) {
    socket.join(`support-user:${socket.user.id}`);
  }

  if (socket.user?.is_admin) {
    socket.join("support-admin");
  }

  socket.on("support:join-ticket", (ticketId) => {
    const normalized = String(ticketId || "").trim();
    if (normalized) {
      socket.join(`support-ticket:${normalized}`);
    }
  });

  socket.on("support:leave-ticket", (ticketId) => {
    const normalized = String(ticketId || "").trim();
    if (normalized) {
      socket.leave(`support-ticket:${normalized}`);
    }
  });
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
const notificationsRoutes = require("./routes/notifications");
const recommendationsRoutes = require("./routes/recommendations");
const referralsRoutes = require("./routes/referrals");

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
app.use("/api/notifications", notificationsRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/api/referrals", referralsRoutes);

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
  console.error(err);
  if (req.path.startsWith("/api")) {
    return res.status(500).json({ message: "Server error" });
  }
  res.status(500).sendFile(path.join(__dirname, "../frontend/500.html"));
});

const PORT = Number(process.env.PORT) || 3000;

const server = httpServer.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Stop the existing server or set PORT to a different value.`);
  } else {
    console.error("❌ Server failed to start:", err);
  }
  process.exit(1);
});
