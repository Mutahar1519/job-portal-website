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
  jobs: [],
  seekerApplications: []
};

function extractJobId(job) {
  return Number(
    job?.id ||
    job?.job_id ||
    job?.job?.id ||
    job?.job?.job_id ||
    job?.data?.id ||
    job?.data?.job_id ||
    job?.data?.job?.id ||
    job?.data?.job?.job_id
  );
}

function normalizeJobsList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.jobs)) return payload.data.jobs;
  return [];
}

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

async function assertResponse(path, validate, options = {}, label = path) {
  const { res, json } = await request(path, options);
  const result = validate({ status: res.status, body: json });
  if (result !== true) {
    throw new Error(`${label} failed validation: ${result}. Response: ${JSON.stringify(json)}`);
  }
  log(`${label} -> ${res.status}`);
  return json;
}

async function assertPageContains(path, markers, label = path) {
  const { res, json } = await request(path);
  if (res.status !== 200) {
    throw new Error(`${label} expected 200 but got ${res.status}`);
  }

  const html = typeof json === "string" ? json : JSON.stringify(json);
  for (const marker of markers) {
    if (!html.includes(marker)) {
      throw new Error(`${label} missing marker: ${marker}`);
    }
  }

  log(`${label} -> 200`);
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

<<<<<<< HEAD
async function registerTempSeeker() {
  const timestamp = Date.now();
  const email = `smoke-seeker-${timestamp}@demo.local`;
  const password = "Demo@1234";

  await assertStatus(
    "/api/users/register",
    [200, 201],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Smoke Seeker ${timestamp}`,
        email,
        password,
        phone: "+1 555 000 2000",
        country: "UK",
        city: "London",
        role: "job_seeker"
      })
    },
    "register-temp-seeker"
  );

  const loginJson = await assertStatus(
    "/api/users/login",
    [200],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    },
    "login-temp-seeker"
  );

  if (!loginJson?.token) {
    throw new Error("login-temp-seeker missing token");
  }

  return { email, password, token: loginJson.token };
}

async function tryGetEmployerJobByTitle(title) {
  if (!state.tokens.employer) return null;

  try {
    const myJobs = await assertStatus(
      "/api/employer/jobs",
      [200],
      {
        headers: { Authorization: `Bearer ${state.tokens.employer}` }
      },
      "employer-jobs"
    );

    const rows = Array.isArray(myJobs) ? myJobs : [];
    return rows.find((job) => (job?.title || "") === title) || null;
  } catch (err) {
    warn(`Unable to fetch employer jobs for fallback target: ${err.message}`);
    return null;
  }
}

async function tryApproveJob(jobId) {
  if (!jobId || !state.tokens.admin) return false;

  try {
    await assertStatus(
      `/api/admin/jobs/${jobId}/approve`,
      [200],
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${state.tokens.admin}` }
      },
      "admin-approve-job"
    );
    return true;
  } catch (err) {
    warn(`Unable to approve fallback smoke job ${jobId}: ${err.message}`);
    return false;
  }
}

function buildPdfBlob() {
  return new Blob(
    [
      "%PDF-1.4\n",
      "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n",
      "2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n",
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n",
      "trailer<</Root 1 0 R>>\n%%EOF\n"
    ],
    { type: "application/pdf" }
  );
=======
function authHeaders(role, extra = {}) {
  return {
    Authorization: `Bearer ${state.tokens[role]}`,
    ...extra
  };
>>>>>>> 46123c6f49ef56229259ec1006b560ffd663fbb0
}

async function run() {
  log(`Base URL: ${BASE_URL}`);

  await assertPageContains("/login.html", ["id=\"oauthProviders\"", "loginForm"], "page-login");
  await assertPageContains("/register.html", ["id=\"oauthProviders\"", "registerForm"], "page-register");
  await assertPageContains("/jobs.html", ["id=\"searchInput\"", "id=\"jobsResultCount\"", "id=\"jobs\""], "page-jobs");
  await assertPageContains("/dashboard.html", ["id=\"applications\"", "id=\"savedJobs\"", "id=\"shiftAlerts\""], "page-dashboard");
  await assertPageContains("/post-jobs.html", ["id=\"postPaymentModal\"", "id=\"donationModal\""], "page-post-job");
  await assertPageContains("/admin.html", ["id=\"adminPaymentModal\"", "reviewQueue"], "page-admin");
  await assertPageContains("/employer.html", ["id=\"shiftPaymentModal\"", "pipeline-board"], "page-employer");

  await assertStatus("/api/health", [200], {}, "health");

  const jobs = await assertStatus("/api/jobs", [200], {}, "list-jobs");
  state.jobs = normalizeJobsList(jobs);

  await login("admin");
  await login("employer");
  await login("seeker");

  await assertStatus("/api/auth/providers", [200], {}, "auth-providers");

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

  const seekerApplications = await assertStatus(
    "/api/applications/my",
    [200],
    {
      headers: authHeaders("seeker")
    },
    "seeker-applications"
  );
  state.seekerApplications = Array.isArray(seekerApplications) ? seekerApplications : [];

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

  let createdJobId = extractJobId(createdJob);

  if (!Number.isFinite(createdJobId) || createdJobId <= 0) {
    const employerJob = await tryGetEmployerJobByTitle(newJobTitle);
    createdJobId = extractJobId(employerJob);
  }

  if (!Number.isFinite(extractJobId(createdJob)) || extractJobId(createdJob) <= 0) {
    const jobsAfterCreate = await assertStatus("/api/jobs", [200], {}, "list-jobs-after-create");
    state.jobs = normalizeJobsList(jobsAfterCreate);
  }

  const alreadyAppliedIds = new Set(
    state.seekerApplications
      .map((item) => Number(item.job_id || item.id))
      .filter((value) => Number.isFinite(value) && value > 0)
  );
  const applyTargetJob = state.jobs.find((job) => {
    const jobId = extractJobId(job);
    return Number.isFinite(jobId) && jobId > 0 && !alreadyAppliedIds.has(jobId);
  });
  const createdByTitle = state.jobs.find((job) => extractJobId(job) === createdJobId || (job?.title || "") === newJobTitle);

  if (!createdByTitle && Number.isFinite(createdJobId) && createdJobId > 0) {
    const approved = await tryApproveJob(createdJobId);
    if (approved) {
      const jobsAfterApprove = await assertStatus("/api/jobs", [200], {}, "list-jobs-after-approve");
      state.jobs = normalizeJobsList(jobsAfterApprove);
    }
  }

  const createdAndApproved = state.jobs.find((job) => extractJobId(job) === createdJobId);
  // Prefer the fresh job we just created to avoid collisions with existing applications.
  const targetJob = createdAndApproved || createdByTitle || createdJob || applyTargetJob || state.jobs[0];
  const targetJobId = extractJobId(targetJob);

  if (targetJobId) {
    await assertPageContains(
      `/job.html?jobId=${targetJobId}`,
      ["id=\"jobDetailTitle\"", "id=\"companyReviewForm\"", "id=\"reportJobForm\""],
      "page-job-detail"
    );

    await assertResponse(
      `/api/jobs/${targetJobId}`,
      ({ status, body }) => {
        if (status !== 200) return `expected 200, got ${status}`;
        const jobId = Number(body && (body.id || body.job_id));
        if (!Number.isFinite(jobId) || jobId !== targetJobId) {
          return `expected job id ${targetJobId}, got ${jobId || "unknown"}`;
        }
        if (!body?.title) return "missing job title";
        return true;
      },
      {},
      "job-detail-api"
    );
  } else {
    warn("No available job ID found for job detail smoke checks; skipping page-job-detail and job-detail-api.");
  }

  const companyJob = state.jobs.find((job) => job && job.company_id);
  if (companyJob?.company_id) {
    await assertStatus(
      `/api/reviews/company/${companyJob.company_id}`,
      [200],
      {},
      "company-reviews"
    );
  } else {
    warn("No job with company_id available; skipping company reviews smoke check.");
  }

  if (targetJobId) {
    await assertStatus(
      `/api/jobs/${targetJobId}/report`,
      [200, 201],
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders("seeker")
        },
        body: JSON.stringify({
          reason: "spam",
          details: "Smoke test report submission"
        })
      },
      "report-job"
    );
  }

  await assertStatus(
    "/api/admin/reviews?status=pending&source=all",
    [200],
    {
      headers: { Authorization: `Bearer ${state.tokens.admin}` }
    },
    "admin-reviews-all"
  );

  await assertResponse(
    "/api/payments/create-checkout-session",
    ({ status, body }) => {
      if (status !== 200) return `expected 200, got ${status}`;
      if (!body?.url) return "missing checkout url";
      return true;
    },
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.tokens.employer}`
      },
      body: JSON.stringify({
        mode: "create",
        donation_cents: 200,
        payment_method: "paypal"
      })
    },
    "payment-create-session"
  );

  await assertResponse(
    "/api/payments/create-donation-session",
    ({ status, body }) => {
      if (status !== 200) return `expected 200, got ${status}`;
      if (!body?.url) return "missing donation session url";
      return true;
    },
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.tokens.seeker}`
      },
      body: JSON.stringify({
        context: "post",
        amount_cents: 200,
        payment_method: "bank_transfer"
      })
    },
    "payment-donation-session"
  );

  if (!targetJobId) {
    warn("No available job ID found for apply-job test; skipping application create.");
  } else {
    const form = new FormData();
    form.append("cover_letter", "Smoke test application submission.");
    form.append("full_name", "Alice Smoke Tester");
    form.append("email", creds.seeker.email);
    form.append("phone", "+1 555 000 1000");
    form.append("country", "UK");
    form.append("cv", buildPdfBlob(), "smoke.pdf");

    await assertResponse(
      `/api/jobs/${targetJobId}/apply`,
      ({ status, body }) => {
        if (status === 201) return true;
        return `expected 201 for fresh application, got ${status} with message ${(body && body.message) || "unknown"}`;
      },
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${state.tokens.seeker}`
        },
        body: form
      },
      "apply-job"
    );

<<<<<<< HEAD
    const duplicateForm = new FormData();
    duplicateForm.append("cover_letter", "Smoke test duplicate application submission.");
    duplicateForm.append("full_name", "Alice Smoke Tester");
    duplicateForm.append("email", creds.seeker.email);
    duplicateForm.append("phone", "+1 555 000 1000");
    duplicateForm.append("country", "UK");
    duplicateForm.append("cv", buildPdfBlob(), "smoke-duplicate.pdf");

    await assertResponse(
      `/api/jobs/${targetJobId}/apply`,
      ({ status, body }) => {
        if (status !== 400) {
          return `expected duplicate application to return 400, got ${status}`;
        }
        if ((body && body.message) === "You have already applied for this job") {
          return true;
        }
        return `expected duplicate application message, got ${(body && body.message) || "unknown"}`;
      },
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${state.tokens.seeker}`
        },
        body: duplicateForm
      },
      "apply-job-duplicate"
=======
    await assertStatus(
      `/api/jobs/${targetJobId}/check-application`,
      [200],
      {
        headers: authHeaders("seeker")
      },
      "check-application-status"
>>>>>>> 46123c6f49ef56229259ec1006b560ffd663fbb0
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

  const tempSeeker = await registerTempSeeker();

  await assertStatus(
    "/api/users/me",
    [200],
    {
      headers: { Authorization: `Bearer ${tempSeeker.token}` }
    },
    "temp-user-me"
  );

  await assertStatus(
    "/api/users/me",
    [200],
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tempSeeker.token}` }
    },
    "temp-user-delete"
  );

  await assertResponse(
    "/api/users/login",
    ({ status, body }) => {
      if (status !== 401) return `expected 401 after deletion, got ${status}`;
      if ((body && body.message) !== "Invalid email or password") {
        return `unexpected message ${(body && body.message) || "unknown"}`;
      }
      return true;
    },
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: tempSeeker.email,
        password: tempSeeker.password
      })
    },
    "temp-user-login-after-delete"
  );

  log("Smoke test completed.");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[smoke:error] ${err.message}`);
    process.exit(1);
  });
