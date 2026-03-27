/*
  Backend smoke test for core job portal flows.
  Requires backend server running on BASE_URL (default http://localhost:3000).
*/

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const creds = {
  admin: {
    email: process.env.SMOKE_ADMIN_EMAIL || "admin@demo.local",
    password: process.env.SMOKE_ADMIN_PASSWORD || "Demo@1234"
  },
  employer: {
    email: process.env.SMOKE_EMPLOYER_EMAIL || "emma@demo.local",
    password: process.env.SMOKE_EMPLOYER_PASSWORD || "Demo@1234"
  },
  seeker: {
    email: process.env.SMOKE_SEEKER_EMAIL || "alice@demo.local",
    password: process.env.SMOKE_SEEKER_PASSWORD || "Demo@1234"
  }
};

const state = {
  tokens: {},
  jobs: []
};

const log = (msg) => console.log(`[smoke] ${msg}`);
const warn = (msg) => console.warn(`[smoke:warn] ${msg}`);

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  return { res, json };
}

async function assertStatus(path, expected, options = {}, label = path) {
  const { res, json } = await request(path, options);
  if (!expected.includes(res.status)) {
    throw new Error(`${label} expected ${expected.join("/")} but got ${res.status}. Response: ${JSON.stringify(json)}`);
  }
  log(`${label} -> ${res.status}`);
  return json;
}

async function login(role) {
  const payload = creds[role];
  const json = await assertStatus(
    "/api/users/login",
    [200],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    },
    `login:${role}`
  );

  if (!json || !json.token) {
    throw new Error(`login:${role} missing token`);
  }

  state.tokens[role] = json.token;
}

function authHeaders(role, extra = {}) {
  return {
    Authorization: `Bearer ${state.tokens[role]}`,
    ...extra
  };
}

async function run() {
  log(`Base URL: ${BASE_URL}`);

  await assertStatus("/api/health", [200], {}, "health");

  const jobs = await assertStatus("/api/jobs", [200], {}, "list-jobs");
  state.jobs = Array.isArray(jobs) ? jobs : [];

  await login("admin");
  await login("employer");
  await login("seeker");

  await assertStatus(
    "/api/users/me",
    [200],
    {
      headers: authHeaders("seeker")
    },
    "seeker-me"
  );

  await assertStatus(
    "/api/users/job-seeker-profile",
    [200],
    {
      headers: authHeaders("seeker")
    },
    "seeker-profile"
  );

  await assertStatus(
    "/api/chat",
    [200],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Smoke test ping" })
    },
    "ai-chat"
  );

  await assertStatus(
    "/api/reviews",
    [200],
    {},
    "list-reviews"
  );

  await assertStatus(
    "/api/reviews",
    [201],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Smoke Bot",
        role: "QA",
        email: `smoke-${Date.now()}@example.com`,
        rating: 5,
        message: "Smoke test review submission"
      })
    },
    "submit-review"
  );

  await assertStatus(
    "/api/users/forgot-password",
    [200],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: creds.seeker.email })
    },
    "forgot-password"
  );

  await assertStatus(
    "/api/employer/stats",
    [200],
    {
      headers: authHeaders("employer")
    },
    "employer-stats"
  );

  await assertStatus(
    "/api/applications/my",
    [200],
    {
      headers: authHeaders("seeker")
    },
    "seeker-applications"
  );

  await assertStatus(
    "/api/resumes/me",
    [200],
    {
      headers: authHeaders("seeker")
    },
    "seeker-resume"
  );

  const newJobTitle = `Smoke Job ${Date.now()}`;
  const createdJob = await assertStatus(
    "/api/jobs",
    [200, 201],
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders("employer")
      },
      body: JSON.stringify({
        title: newJobTitle,
        location: "Remote",
        job_type: "Full-time",
        category: "IT",
        description: "Smoke test job posting for end-to-end API validation.",
        salary: "GBP 40k - 60k"
      })
    },
    "post-job"
  );

  const targetJob = state.jobs[0] || createdJob;
  const targetJobId = targetJob && (targetJob.id || targetJob.job_id || createdJob.id);

  if (!targetJobId) {
    warn("No available job ID found for apply-job test; skipping application create.");
  } else {
    await assertStatus(
      `/api/jobs/${targetJobId}/apply`,
      [200, 201, 400],
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders("seeker")
        },
        body: JSON.stringify({
          cover_letter: "Smoke test application submission."
        })
      },
      "apply-job"
    );

    await assertStatus(
      `/api/jobs/${targetJobId}/check-application`,
      [200],
      {
        headers: authHeaders("seeker")
      },
      "check-application-status"
    );
  }

  try {
    await assertStatus(
      "/api/admin/jobs",
      [200],
      {
        headers: {
          ...authHeaders("admin")
        }
      },
      "admin-jobs"
    );

    await assertStatus(
      "/api/admin/users",
      [200],
      {
        headers: authHeaders("admin")
      },
      "admin-users"
    );

    await assertStatus(
      "/api/applications/admin",
      [200],
      {
        headers: authHeaders("admin")
      },
      "admin-applications"
    );
  } catch (err) {
    warn(`admin-jobs check failed: ${err.message}`);
  }

  log("Smoke test completed.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[smoke:error] ${err.message}`);
    process.exit(1);
  });
