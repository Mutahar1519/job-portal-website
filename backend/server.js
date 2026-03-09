const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./config/mysql");

const app = express();

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

app.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
});
