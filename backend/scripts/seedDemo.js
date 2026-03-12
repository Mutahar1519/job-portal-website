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

const ensureUser = async ({ name, email, password, role, isAdmin = 0, phone, country, city }, userCols) => {
  const existing = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing.length) return existing[0].id;

  const hashed = await bcrypt.hash(password, 10);
  const payload = { name, email, password: hashed, role, is_admin: isAdmin, verified: 1, phone, country, city };
  const { sql, params } = buildInsert("users", payload, userCols);
  const result = await query(sql, params);
  return result.insertId;
};

const ensureCompany = async ({ owner_user_id, name, website, location, industry, description, logo_url }, companyCols) => {
  const existing = await query("SELECT id FROM companies WHERE owner_user_id = ? LIMIT 1", [owner_user_id]);
  if (existing.length) return existing[0].id;
  const { sql, params } = buildInsert("companies", { owner_user_id, name, website, location, industry, description, logo_url }, companyCols);
  const result = await query(sql, params);
  return result.insertId;
};

const ensureJob = async (job, jobsCols) => {
  const existing = await query("SELECT id FROM jobs WHERE title = ? AND posted_by = ? LIMIT 1", [job.title, job.posted_by]);
  if (existing.length) return existing[0].id;
  const { sql, params } = buildInsert("jobs", job, jobsCols);
  const result = await query(sql, params);
  return result.insertId;
};

const ensureApplication = async (app, appCols) => {
  const existing = await query("SELECT id FROM applications WHERE user_id = ? AND job_id = ? LIMIT 1", [app.user_id, app.job_id]);
  if (existing.length) return existing[0].id;
  const { sql, params } = buildInsert("applications", app, appCols);
  const result = await query(sql, params);
  return result.insertId;
};

async function run() {
  try {
    // Verify required tables exist
    for (const tbl of ["users", "jobs", "applications"]) {
      if (!(await hasTable(tbl))) throw new Error(`Table '${tbl}' missing — run initDb first.`);
    }

    const userCols = await getColumns("users");
    const jobsCols = await getColumns("jobs");
    const appCols = await getColumns("applications");
    const companyCols = (await hasTable("companies")) ? await getColumns("companies") : new Set();
    const reviewCols = (await hasTable("reviews")) ? await getColumns("reviews") : new Set();
    const alertCols = (await hasTable("job_alerts")) ? await getColumns("job_alerts") : new Set();
    const savedCols = (await hasTable("saved_jobs")) ? await getColumns("saved_jobs") : new Set();
    const escrowCols = (await hasTable("shift_escrows")) ? await getColumns("shift_escrows") : new Set();
    const notifCols = (await hasTable("shift_notifications")) ? await getColumns("shift_notifications") : new Set();
    const settingsCols = (await hasTable("platform_settings")) ? await getColumns("platform_settings") : new Set();
    const empProfileCols = (await hasTable("employer_profiles")) ? await getColumns("employer_profiles") : new Set();
    const profileCols = (await hasTable("job_seeker_profiles")) ? await getColumns("job_seeker_profiles") : new Set();

    const PW = "Demo@1234";

    // ── USERS ──────────────────────────────────────────────
    const adminId = await ensureUser({ name: "System Admin", email: "admin@demo.local", password: PW, role: "admin", isAdmin: 1, phone: "+441111000001", country: "UK", city: "London" }, userCols);

    const emp1Id = await ensureUser({ name: "Emma Employer", email: "emma@demo.local", password: PW, role: "employer", phone: "+441111000002", country: "UK", city: "London" }, userCols);
    const emp2Id = await ensureUser({ name: "Carlos Tech", email: "carlos@demo.local", password: PW, role: "employer", phone: "+441111000003", country: "UK", city: "Manchester" }, userCols);
    const emp3Id = await ensureUser({ name: "Sarah Studio", email: "sarah@demo.local", password: PW, role: "employer", phone: "+441111000004", country: "UK", city: "Birmingham" }, userCols);

    const seek1Id = await ensureUser({ name: "Alice Candidate", email: "alice@demo.local", password: PW, role: "job_seeker", phone: "+447700900111", country: "UK", city: "London" }, userCols);
    const seek2Id = await ensureUser({ name: "Bob Builder", email: "bob@demo.local", password: PW, role: "job_seeker", phone: "+447700900222", country: "UK", city: "Bristol" }, userCols);
    const seek3Id = await ensureUser({ name: "Clara Dev", email: "clara@demo.local", password: PW, role: "job_seeker", phone: "+447700900333", country: "UK", city: "Edinburgh" }, userCols);

    console.log("✔ Users seeded");

    // ── COMPANIES ──────────────────────────────────────────
    const co1Id = await ensureCompany({ owner_user_id: emp1Id, name: "Nova Talent Labs", website: "https://novatalent.example", location: "London", industry: "Technology", description: "We build products that connect developers to opportunity.", logo_url: "https://api.dicebear.com/7.x/shapes/svg?seed=Nova" }, companyCols);
    const co2Id = await ensureCompany({ owner_user_id: emp2Id, name: "CloudStack Ltd", website: "https://cloudstack.example", location: "Manchester", industry: "SaaS", description: "Cloud infrastructure and DevOps solutions.", logo_url: "https://api.dicebear.com/7.x/shapes/svg?seed=Cloud" }, companyCols);
    const co3Id = await ensureCompany({ owner_user_id: emp3Id, name: "Pixel & Co", website: "https://pixelco.example", location: "Birmingham", industry: "Design", description: "Award-winning UX and branding studio.", logo_url: "https://api.dicebear.com/7.x/shapes/svg?seed=Pixel" }, companyCols);

    // Employer profiles
    if (empProfileCols.size) {
      for (const [uid, cname] of [[emp1Id, "Nova Talent Labs"], [emp2Id, "CloudStack Ltd"], [emp3Id, "Pixel & Co"]]) {
        const ex = await query("SELECT id FROM employer_profiles WHERE user_id = ? LIMIT 1", [uid]);
        if (!ex.length) {
          const { sql, params } = buildInsert("employer_profiles", { user_id: uid, company_name: cname, industry: "Technology", company_size: "11-50" }, empProfileCols);
          await query(sql, params);
        }
      }
    }

    console.log("✔ Companies seeded");

    // ── JOBS ──────────────────────────────────────────────
    const now = new Date();
    const dl = (daysAhead) => { const d = new Date(now); d.setDate(d.getDate() + daysAhead); return d; };
    const shiftDate = (daysAhead, hour) => { const d = new Date(now); d.setDate(d.getDate() + daysAhead); d.setHours(hour, 0, 0, 0); return d; };

    const baseJob = { is_approved: 1, is_shift: 0, moderation_status: "approved_auto", moderation_score: 85 };

    const j1 = await ensureJob({ ...baseJob, title: "Senior Frontend Developer", location: "Remote", job_type: "Full-time", category: "IT", description: "Build beautiful, performant UIs using React, TypeScript, and modern CSS. You will lead feature development across our web platform, collaborate with designers, and mentor junior engineers. Strong accessibility and performance awareness expected.", is_premium: 1, posted_by: emp1Id, company_id: co1Id, application_deadline: dl(30) }, jobsCols);
    const j2 = await ensureJob({ ...baseJob, title: "Backend Node.js Engineer", location: "London", job_type: "Hybrid", category: "IT", description: "Design and maintain RESTful APIs, optimise SQL queries, and build scalable services in Node.js/Express. 3+ years experience with MySQL or Postgres required. CI/CD and Docker familiarity a plus.", is_premium: 0, posted_by: emp1Id, company_id: co1Id, application_deadline: dl(21) }, jobsCols);
    const j3 = await ensureJob({ ...baseJob, title: "DevOps Engineer", location: "Manchester", job_type: "Full-time", category: "IT", description: "Own our cloud infrastructure on AWS, write Terraform modules, manage Kubernetes clusters, and champion reliability. On-call rotation required.", is_premium: 1, posted_by: emp2Id, company_id: co2Id, application_deadline: dl(45) }, jobsCols);
    const j4 = await ensureJob({ ...baseJob, title: "Product Designer", location: "Birmingham", job_type: "Full-time", category: "Design", description: "Create user-centred designs from discovery through delivery. You will run workshops, produce Figma prototypes, and work side-by-side with engineers to ship polished product experiences.", is_premium: 0, posted_by: emp3Id, company_id: co3Id, application_deadline: dl(20) }, jobsCols);
    const j5 = await ensureJob({ ...baseJob, title: "UX Researcher", location: "Remote", job_type: "Part-time", category: "Design", description: "Conduct interviews, surveys, and usability sessions. Synthesise insights and present actionable findings to product and engineering teams.", is_premium: 0, posted_by: emp3Id, company_id: co3Id, application_deadline: dl(14) }, jobsCols);
    const j6 = await ensureJob({ ...baseJob, title: "Data Analyst", location: "London", job_type: "Full-time", category: "Finance", description: "Analyse large datasets, build dashboards in Power BI/Tableau, and present weekly performance reports to leadership.", is_premium: 1, posted_by: emp2Id, company_id: co2Id, application_deadline: dl(35) }, jobsCols);
    const j7 = await ensureJob({ ...baseJob, title: "Marketing Manager", location: "Bristol", job_type: "Full-time", category: "Marketing", description: "Lead multi-channel campaigns, manage a small content team, and drive measurable growth across paid and organic channels.", is_premium: 0, posted_by: emp1Id, company_id: co1Id, application_deadline: dl(28) }, jobsCols);
    const j8 = await ensureJob({ ...baseJob, title: "Customer Support Specialist", location: "Remote", job_type: "Full-time", category: "Customer Service", description: "Provide empathetic, efficient support across email and chat. Maintain a CSAT above 95% and escalate technical issues appropriately.", is_premium: 0, posted_by: emp2Id, company_id: co2Id, application_deadline: dl(10) }, jobsCols);
    const j9 = await ensureJob({ ...baseJob, title: "Junior Software Developer", location: "Edinburgh", job_type: "Full-time", category: "IT", description: "Entry-level role for a developer keen to grow their skills in a supportive team. Expect code reviews, pair programming, and a structured mentorship programme.", is_premium: 0, posted_by: emp3Id, company_id: co3Id, application_deadline: dl(25) }, jobsCols);
    const j10 = await ensureJob({ ...baseJob, title: "HR Business Partner", location: "London", job_type: "Hybrid", category: "HR", description: "Partner with business leaders on talent management, performance cycles, and organisational design initiatives.", is_premium: 0, posted_by: adminId, company_id: null, application_deadline: dl(18) }, jobsCols);

    // Shift jobs
    const s1 = await ensureJob({ ...baseJob, title: "Event Staff – Tech Conference", location: "London", job_type: "Shift", category: "Hospitality", description: "Welcome delegates, manage badge scanning, and assist with AV setup at a major technology conference.", is_premium: 0, posted_by: emp1Id, company_id: co1Id, is_shift: 1, shift_start: shiftDate(5, 9), shift_end: shiftDate(5, 18), shift_pay_cents: 12000, shift_fee_cents: 1200, shift_total_cents: 13200, shift_currency: "gbp", shift_paid: 1, shift_status: "open" }, jobsCols);
    const s2 = await ensureJob({ ...baseJob, title: "Warehouse Picker", location: "Manchester", job_type: "Shift", category: "Logistics", description: "Pick and pack orders accurately in a fast-paced fulfilment centre. Full training provided.", is_premium: 0, posted_by: emp2Id, company_id: co2Id, is_shift: 1, shift_start: shiftDate(3, 6), shift_end: shiftDate(3, 14), shift_pay_cents: 9600, shift_fee_cents: 960, shift_total_cents: 10560, shift_currency: "gbp", shift_paid: 1, shift_status: "open" }, jobsCols);
    const s3 = await ensureJob({ ...baseJob, title: "Barista Cover – City Branch", location: "Birmingham", job_type: "Shift", category: "Hospitality", description: "Cover a morning shift at our Birmingham branch. Barista experience required.", is_premium: 0, posted_by: emp3Id, company_id: co3Id, is_shift: 1, shift_start: shiftDate(2, 7), shift_end: shiftDate(2, 13), shift_pay_cents: 7800, shift_fee_cents: 780, shift_total_cents: 8580, shift_currency: "gbp", shift_paid: 1, shift_status: "open" }, jobsCols);
    const s4 = await ensureJob({ ...baseJob, title: "Delivery Driver", location: "Bristol", job_type: "Shift", category: "Logistics", description: "Same-day delivery driver for local parcels. Own vehicle and clean licence required.", is_premium: 1, posted_by: emp1Id, company_id: co1Id, is_shift: 1, shift_start: shiftDate(7, 8), shift_end: shiftDate(7, 16), shift_pay_cents: 11200, shift_fee_cents: 1120, shift_total_cents: 12320, shift_currency: "gbp", shift_paid: 1, shift_status: "open" }, jobsCols);

    console.log("✔ Jobs seeded");

    // ── APPLICATIONS ──────────────────────────────────────
    const app1Id = await ensureApplication({ user_id: seek1Id, job_id: j1, full_name: "Alice Candidate", email: "alice@demo.local", phone: "+447700900111", country: "UK", cover_letter: "I am deeply passionate about frontend development and would love the opportunity to contribute to Nova Talent Labs. I have 4 years experience in React and TypeScript.", status: "pending", pipeline_stage: "new" }, appCols);
    const app2Id = await ensureApplication({ user_id: seek1Id, job_id: j2, full_name: "Alice Candidate", email: "alice@demo.local", phone: "+447700900111", country: "UK", cover_letter: "I have extensive Node.js experience including API design and SQL query optimisation. Excited by this opportunity.", status: "reviewed", pipeline_stage: "screen" }, appCols);
    const app3Id = await ensureApplication({ user_id: seek2Id, job_id: j3, full_name: "Bob Builder", email: "bob@demo.local", phone: "+447700900222", country: "UK", cover_letter: "DevOps is my passion. I have 3 years managing AWS infrastructure and writing Terraform at scale.", status: "shortlisted", pipeline_stage: "interview" }, appCols);
    const app4Id = await ensureApplication({ user_id: seek2Id, job_id: j4, full_name: "Bob Builder", email: "bob@demo.local", phone: "+447700900222", country: "UK", cover_letter: "I transitioned into UX design two years ago and have a strong portfolio of end-to-end Figma projects.", status: "rejected", pipeline_stage: "rejected" }, appCols);
    const app5Id = await ensureApplication({ user_id: seek3Id, job_id: j6, full_name: "Clara Dev", email: "clara@demo.local", phone: "+447700900333", country: "UK", cover_letter: "My SQL and Power BI skills are strong, and I thrive in data-driven environments.", status: "hired", pipeline_stage: "hired" }, appCols);
    const app6Id = await ensureApplication({ user_id: seek3Id, job_id: j9, full_name: "Clara Dev", email: "clara@demo.local", phone: "+447700900333", country: "UK", cover_letter: "I am a recent computer science graduate eager to grow in a mentored environment.", status: "pending", pipeline_stage: "new" }, appCols);

    // Applications for shift jobs
    const appS1Id = await ensureApplication({ user_id: seek1Id, job_id: s1, full_name: "Alice Candidate", email: "alice@demo.local", phone: "+447700900111", country: "UK", cover_letter: "Happy to assist at the tech conference — I have previous event staffing experience.", status: "hired", pipeline_stage: "hired" }, appCols);
    const appS2Id = await ensureApplication({ user_id: seek2Id, job_id: s2, full_name: "Bob Builder", email: "bob@demo.local", phone: "+447700900222", country: "UK", cover_letter: "Available for the warehouse shift and experienced with pick-and-pack.", status: "hired", pipeline_stage: "hired" }, appCols);

    console.log("✔ Applications seeded");

    // ── SAVED JOBS ─────────────────────────────────────────
    if (savedCols.size) {
      for (const [uid, jid] of [[seek1Id, j3], [seek1Id, j4], [seek2Id, j1], [seek3Id, j7]]) {
        const ex = await query("SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ? LIMIT 1", [uid, jid]);
        if (!ex.length) {
          const { sql, params } = buildInsert("saved_jobs", { user_id: uid, job_id: jid }, savedCols);
          await query(sql, params);
        }
      }
      console.log("✔ Saved jobs seeded");
    }

    // ── JOB ALERTS ─────────────────────────────────────────
    if (alertCols.size) {
      const alertDefs = [
        { user_id: seek1Id, keyword: "developer", location: "Remote", category: "IT", job_type: "Full-time", frequency: "daily" },
        { user_id: seek2Id, keyword: "devops", location: "Manchester", category: "IT", job_type: "Full-time", frequency: "weekly" },
        { user_id: seek3Id, keyword: "analyst", location: "London", category: "Finance", job_type: "Full-time", frequency: "daily" }
      ];
      for (const alert of alertDefs) {
        const ex = await query("SELECT id FROM job_alerts WHERE user_id = ? AND keyword = ? LIMIT 1", [alert.user_id, alert.keyword]);
        if (!ex.length) {
          const { sql, params } = buildInsert("job_alerts", { ...alert, is_active: 1 }, alertCols);
          await query(sql, params);
        }
      }
      console.log("✔ Job alerts seeded");
    }

    // ── SHIFT NOTIFICATIONS ───────────────────────────────
    if (notifCols.size) {
      const notifs = [
        { user_id: seek1Id, job_id: s1, status: "posted", is_read: 0 },
        { user_id: seek2Id, job_id: s2, status: "posted", is_read: 0 },
        { user_id: seek3Id, job_id: s3, status: "posted", is_read: 1 }
      ];
      for (const n of notifs) {
        const ex = await query("SELECT id FROM shift_notifications WHERE user_id = ? AND job_id = ? LIMIT 1", [n.user_id, n.job_id]);
        if (!ex.length) {
          const { sql, params } = buildInsert("shift_notifications", n, notifCols);
          await query(sql, params);
        }
      }
      console.log("✔ Shift notifications seeded");
    }

    // ── SHIFT ESCROWS ──────────────────────────────────────
    if (escrowCols.size && appS1Id && appS2Id) {
      const escrows = [
        { job_id: s1, application_id: appS1Id, client_id: emp1Id, worker_id: seek1Id, pay_cents: 12000, fee_cents: 1200, total_cents: 13200, currency: "gbp", status: "completed", client_confirmed: 1, worker_confirmed: 1, release_at: shiftDate(5, 20) },
        { job_id: s2, application_id: appS2Id, client_id: emp2Id, worker_id: seek2Id, pay_cents: 9600, fee_cents: 960, total_cents: 10560, currency: "gbp", status: "awaiting_confirmation", client_confirmed: 0, worker_confirmed: 0, release_at: shiftDate(3, 16) }
      ];
      for (const e of escrows) {
        const ex = await query("SELECT id FROM shift_escrows WHERE application_id = ? LIMIT 1", [e.application_id]);
        if (!ex.length) {
          const { sql, params } = buildInsert("shift_escrows", e, escrowCols);
          await query(sql, params);
        }
      }
      console.log("✔ Shift escrows seeded");
    }

    // ── REVIEWS ────────────────────────────────────────────
    if (reviewCols.size) {
      const reviews = [
        { name: "Alice Candidate", role: "Software Engineer", email: "alice@demo.local", rating: 5, message: "Found my dream job within two weeks. The job alerts feature is brilliant.", approved: 1 },
        { name: "Bob Builder", role: "Logistics Specialist", email: "bob@demo.local", rating: 4, message: "Great platform for shift work. Easy to apply and payments are fast.", approved: 1 },
        { name: "Clara Dev", role: "Data Analyst", email: "clara@demo.local", rating: 5, message: "Hired through the portal in record time. The employer tools are excellent.", approved: 1 },
        { name: "Daniel Wright", role: "UX Designer", email: "daniel@example.com", rating: 4, message: "Clean UI and a really solid experience from start to finish.", approved: 1 },
        { name: "Fiona Grant", role: "HR Manager", email: "fiona@example.com", rating: 5, message: "We filled three roles in a month. The premium listings really work.", approved: 1 },
        { name: "George Hill", role: "Junior Developer", email: "george@example.com", rating: 3, message: "Good experience overall. Would love more filter options for junior roles.", approved: 0 },
        { name: "Hannah Yu", role: "Marketing Executive", email: "hannah@example.com", rating: 4, message: "Used the platform for our latest campaign hire. Smooth and professional.", approved: 0 },
        { name: "Spam Account", role: "SEO Guru", email: "spam@example.com", rating: 5, message: "Check out my site for jobs!!!", approved: 0, is_hidden: 1 }
      ];
      for (const r of reviews) {
        const ex = await query("SELECT id FROM reviews WHERE email = ? AND name = ? LIMIT 1", [r.email, r.name]);
        if (!ex.length) {
          const { sql, params } = buildInsert("reviews", r, reviewCols);
          await query(sql, params);
        }
      }
      console.log("✔ Reviews seeded");
    }

    // ── JOB SEEKER PROFILES ────────────────────────────────
    if (profileCols.size) {
      const profiles = [
        { user_id: seek1Id, job_title: "Frontend Developer", skills: "React, TypeScript, CSS, Node.js", experience_years: 4, location: "London", about: "Passionate developer with a focus on accessible, performant web experiences." },
        { user_id: seek2Id, job_title: "DevOps / Logistics", skills: "AWS, Terraform, Kubernetes, Docker", experience_years: 3, location: "Bristol", about: "Cloud infrastructure enthusiast with logistics shift experience." },
        { user_id: seek3Id, job_title: "Data Analyst", skills: "SQL, Python, Power BI, Tableau", experience_years: 2, location: "Edinburgh", about: "Data-driven analyst with a passion for clear, actionable insights." }
      ];
      for (const p of profiles) {
        const ex = await query("SELECT id FROM job_seeker_profiles WHERE user_id = ? LIMIT 1", [p.user_id]);
        if (!ex.length) {
          const { sql, params } = buildInsert("job_seeker_profiles", p, profileCols);
          await query(sql, params);
        }
      }
      console.log("✔ Job seeker profiles seeded");
    }

    // ── PLATFORM SETTINGS ──────────────────────────────────
    if (settingsCols.size) {
      const settings = [
        { setting_key: "auto_approve_jobs", setting_value: "false" },
        { setting_key: "site_name", setting_value: "Job Portal Demo" },
        { setting_key: "max_applications_per_user", setting_value: "20" }
      ];
      for (const s of settings) {
        const ex = await query("SELECT setting_key FROM platform_settings WHERE setting_key = ? LIMIT 1", [s.setting_key]);
        if (!ex.length) {
          const { sql, params } = buildInsert("platform_settings", s, settingsCols);
          await query(sql, params);
        }
      }
      console.log("✔ Platform settings seeded");
    }

    console.log("\n========================================");
    console.log("  DEMO SEED COMPLETE");
    console.log("  Password for all accounts: Demo@1234");
    console.log("----------------------------------------");
    console.log("  admin@demo.local    → Admin panel");
    console.log("  emma@demo.local     → Employer (Nova Talent Labs)");
    console.log("  carlos@demo.local   → Employer (CloudStack Ltd)");
    console.log("  sarah@demo.local    → Employer (Pixel & Co)");
    console.log("  alice@demo.local    → Job Seeker (Alice Candidate)");
    console.log("  bob@demo.local      → Job Seeker (Bob Builder)");
    console.log("  clara@demo.local    → Job Seeker (Clara Dev)");
    console.log("========================================\n");

    process.exit(0);
  } catch (err) {
    console.error("Demo seed failed:", err.message);
    process.exit(1);
  }
}

run();
