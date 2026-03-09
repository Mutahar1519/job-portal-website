const bcrypt = require("bcryptjs");
const db = require("../config/mysql");

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

const getColumns = async (tableName) => {
  const rows = await query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [tableName]
  );
  return new Set(rows.map((r) => r.COLUMN_NAME));
};

const hasTable = async (tableName) => {
  const rows = await query(
    "SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [tableName]
  );
  return rows.length > 0;
};

const buildInsert = (tableName, values, existingColumns) => {
  const keys = Object.keys(values).filter((k) => existingColumns.has(k));
  const placeholders = keys.map(() => "?").join(", ");
  const sql = `INSERT INTO ${tableName} (${keys.join(", ")}) VALUES (${placeholders})`;
  const params = keys.map((k) => values[k]);
  return { sql, params, keys };
};

const findUserByEmail = async (email, userCols) => {
  if (!userCols.has("email")) return null;
  const rows = await query("SELECT id, email FROM users WHERE email = ? LIMIT 1", [email]);
  return rows[0] || null;
};

const ensureUser = async ({ name, email, password, role, isAdmin = 0 }, userCols) => {
  const existing = await findUserByEmail(email, userCols);
  if (existing) return existing.id;

  const hashed = await bcrypt.hash(password, 10);
  const payload = {
    name,
    email,
    password: hashed,
    role,
    is_admin: isAdmin,
    verified: 1,
    phone: "+10000000000",
    country: "UK",
    city: "London"
  };

  const { sql, params } = buildInsert("users", payload, userCols);
  const result = await query(sql, params);
  return result.insertId;
};

const ensureCompanyForEmployer = async (employerId, companyCols) => {
  if (!companyCols || !companyCols.size) return null;

  let rows = [];
  if (companyCols.has("owner_user_id")) {
    rows = await query("SELECT id FROM companies WHERE owner_user_id = ? LIMIT 1", [employerId]);
  }
  if (rows.length) return rows[0].id;

  const payload = {
    owner_user_id: employerId,
    name: "Nova Talent Labs",
    website: "https://novatalent.example",
    location: "London",
    logo_url: "https://api.dicebear.com/7.x/shapes/svg?seed=NovaTalent",
    description: "Hiring platform-focused engineers and designers."
  };

  const { sql, params } = buildInsert("companies", payload, companyCols);
  const result = await query(sql, params);
  return result.insertId;
};

const ensureJobs = async (employerId, companyId, jobsCols) => {
  const jobsToCreate = [
    {
      title: "Frontend Developer",
      location: "Remote",
      job_type: "Full-time",
      category: "IT",
      description: "Build and maintain modern UI features with React and accessible design patterns.",
      salary: "GBP 50k - 70k",
      is_premium: 1,
      is_approved: 1,
      posted_by: employerId,
      company_id: companyId,
      is_shift: 0
    },
    {
      title: "Backend Node.js Engineer",
      location: "London",
      job_type: "Hybrid",
      category: "IT",
      description: "Design APIs, improve SQL performance, and deliver robust Node.js services.",
      salary: "GBP 60k - 85k",
      is_premium: 0,
      is_approved: 1,
      posted_by: employerId,
      company_id: companyId,
      is_shift: 0
    },
    {
      title: "Product Designer",
      location: "Manchester",
      job_type: "Full-time",
      category: "Design",
      description: "Create polished UX flows, prototypes, and scalable design systems.",
      salary: "GBP 45k - 65k",
      is_premium: 0,
      is_approved: 1,
      posted_by: employerId,
      company_id: companyId,
      is_shift: 0
    }
  ];

  const insertedJobIds = [];

  for (const job of jobsToCreate) {
    const existing = await query(
      "SELECT id FROM jobs WHERE title = ? AND posted_by = ? LIMIT 1",
      [job.title, employerId]
    );

    if (existing.length) {
      insertedJobIds.push(existing[0].id);
      continue;
    }

    const { sql, params } = buildInsert("jobs", job, jobsCols);
    const result = await query(sql, params);
    insertedJobIds.push(result.insertId);
  }

  return insertedJobIds;
};

const ensureApplications = async (jobSeekerId, jobIds, appCols) => {
  for (const jobId of jobIds.slice(0, 2)) {
    const existing = await query(
      "SELECT id FROM applications WHERE user_id = ? AND job_id = ? LIMIT 1",
      [jobSeekerId, jobId]
    );

    if (existing.length) continue;

    const payload = {
      user_id: jobSeekerId,
      job_id: jobId,
      full_name: "Alice Candidate",
      email: "alice.seeker@example.com",
      phone: "+447700900111",
      country: "UK",
      cover_letter: "I am excited to apply and contribute with strong product engineering skills.",
      status: "pending",
      pipeline_stage: "new"
    };

    const { sql, params } = buildInsert("applications", payload, appCols);
    await query(sql, params);
  }
};

async function run() {
  try {
    const usersExists = await hasTable("users");
    const jobsExists = await hasTable("jobs");
    const appsExists = await hasTable("applications");

    if (!usersExists || !jobsExists || !appsExists) {
      throw new Error("Required tables missing. Ensure users, jobs, and applications exist before seeding.");
    }

    const userCols = await getColumns("users");
    const jobsCols = await getColumns("jobs");
    const appCols = await getColumns("applications");
    const companyCols = (await hasTable("companies")) ? await getColumns("companies") : new Set();

    const adminId = await ensureUser(
      {
        name: "System Admin",
        email: "admin.demo@jobportal.local",
        password: "Admin@123",
        role: "admin",
        isAdmin: 1
      },
      userCols
    );

    const employerId = await ensureUser(
      {
        name: "Emma Employer",
        email: "employer.demo@jobportal.local",
        password: "Employer@123",
        role: "employer",
        isAdmin: 0
      },
      userCols
    );

    const seekerId = await ensureUser(
      {
        name: "Alice Candidate",
        email: "seeker.demo@jobportal.local",
        password: "Seeker@123",
        role: "job_seeker",
        isAdmin: 0
      },
      userCols
    );

    const companyId = await ensureCompanyForEmployer(employerId, companyCols);
    const jobIds = await ensureJobs(employerId, companyId, jobsCols);
    await ensureApplications(seekerId, jobIds, appCols);

    console.log("Demo seed completed successfully.");
    console.log("Admin:", "admin.demo@jobportal.local", "/", "Admin@123");
    console.log("Employer:", "employer.demo@jobportal.local", "/", "Employer@123");
    console.log("Job Seeker:", "seeker.demo@jobportal.local", "/", "Seeker@123");

    process.exit(0);
  } catch (err) {
    console.error("Demo seed failed:", err.message);
    process.exit(1);
  }
}

run();
