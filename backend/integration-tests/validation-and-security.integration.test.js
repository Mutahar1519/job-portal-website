/*
  API integration checks for validation + auth hardening.
  Requires backend server running on BASE_URL.
*/

const assert = require("assert");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const seekerCreds = {
  email: process.env.SMOKE_SEEKER_EMAIL || "alice@demo.local",
  password: process.env.SMOKE_SEEKER_PASSWORD || "Demo@1234"
};
const adminCreds = {
  email: process.env.SMOKE_ADMIN_EMAIL || "admin@demo.local",
  password: process.env.SMOKE_ADMIN_PASSWORD || "Demo@1234"
};

const request = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { status: res.status, body };
};

const expectStatus = async (path, allowed, options = {}, label = path) => {
  const result = await request(path, options);
  if (!allowed.includes(result.status)) {
    throw new Error(`${label} expected ${allowed.join("/")} but got ${result.status}. Body: ${JSON.stringify(result.body)}`);
  }
  console.log(`[integration] ${label}: ${result.status}`);
  return result;
};

async function runIntegrationChecks() {
  // Health endpoint reachable
  await expectStatus("/api/health", [200], {}, "health");

  // Validation should block malformed login payload before controller logic.
  const badLogin = await expectStatus(
    "/api/users/login",
    [400],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "x" })
    },
    "users/login invalid email format"
  );
  assert.strictEqual(badLogin.body && badLogin.body.code, "VALIDATION_ERROR");

  // Unauthorized access should be blocked on protected endpoints.
  await expectStatus(
    "/api/reviews/company/1",
    [401],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "Candidate", rating: 5, message: "Great" })
    },
    "reviews/company unauthorized"
  );

  // Login seeker to run authenticated validation checks.
  const login = await expectStatus(
    "/api/users/login",
    [200],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(seekerCreds)
    },
    "users/login seeker"
  );

  if (!login.body || !login.body.token) {
    throw new Error("users/login seeker returned no token");
  }

  const authHeader = { Authorization: `Bearer ${login.body.token}`, "Content-Type": "application/json" };

  // Payment route validation: invalid donation amount should fail.
  const badDonation = await expectStatus(
    "/api/payments/create-donation-session",
    [400],
    {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({ context: "apply", amount_cents: 0, payment_method: "card" })
    },
    "payments/create-donation-session invalid amount"
  );
  assert.strictEqual(badDonation.body && badDonation.body.code, "VALIDATION_ERROR");

  // Review route validation: invalid rating should fail.
  const badReview = await expectStatus(
    "/api/reviews",
    [400],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "A", role: "User", rating: 9, message: "x" })
    },
    "reviews invalid rating"
  );
  assert.strictEqual(badReview.body && badReview.body.code, "VALIDATION_ERROR");

  // Create a valid public review for admin moderation flow checks.
  const marker = `integration-review-${Date.now()}`;
  const createdReview = await expectStatus(
    "/api/reviews",
    [201],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Integration Tester",
        role: "QA",
        email: `qa+${marker}@demo.local`,
        rating: 5,
        message: `Review pipeline check ${marker}`
      })
    },
    "reviews create valid portal review"
  );
  assert.strictEqual(createdReview.body && createdReview.body.message, "Review submitted for approval");

  // Login admin for protected flow checks.
  const adminLogin = await expectStatus(
    "/api/users/login",
    [200],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminCreds)
    },
    "users/login admin"
  );

  if (!adminLogin.body || !adminLogin.body.token) {
    throw new Error("users/login admin returned no token");
  }

  const adminHeaders = { Authorization: `Bearer ${adminLogin.body.token}`, "Content-Type": "application/json" };

  // Find the newly created pending portal review and approve it.
  const pendingPortal = await expectStatus(
    "/api/admin/reviews?status=pending&source=portal",
    [200],
    { headers: adminHeaders },
    "admin/reviews pending portal"
  );

  const pendingRows = Array.isArray(pendingPortal.body) ? pendingPortal.body : [];
  const targetReview = pendingRows.find((row) => String(row.message || "").includes(marker));
  if (!targetReview || !targetReview.id) {
    throw new Error("Failed to locate created pending portal review for moderation test");
  }

  await expectStatus(
    `/api/admin/reviews/${targetReview.id}/approve?source=portal`,
    [200],
    { method: "PUT", headers: adminHeaders },
    "admin/reviews approve portal"
  );

  const approvedPortal = await expectStatus(
    "/api/admin/reviews?status=approved&source=portal",
    [200],
    { headers: adminHeaders },
    "admin/reviews approved portal"
  );
  const approvedRows = Array.isArray(approvedPortal.body) ? approvedPortal.body : [];
  const approved = approvedRows.find((row) => Number(row.id) === Number(targetReview.id));
  assert.ok(approved, "Approved review should be visible in approved portal list");

  // Hide approved review and verify hidden list.
  await expectStatus(
    `/api/admin/reviews/${targetReview.id}/hide?source=portal`,
    [200],
    { method: "PUT", headers: adminHeaders },
    "admin/reviews hide portal"
  );

  const hiddenPortal = await expectStatus(
    "/api/admin/reviews?status=hidden&source=portal",
    [200],
    { headers: adminHeaders },
    "admin/reviews hidden portal"
  );
  const hiddenRows = Array.isArray(hiddenPortal.body) ? hiddenPortal.body : [];
  const hidden = hiddenRows.find((row) => Number(row.id) === Number(targetReview.id));
  assert.ok(hidden, "Hidden review should be visible in hidden portal list");

  // Unhide back to approved.
  await expectStatus(
    `/api/admin/reviews/${targetReview.id}/unhide?source=portal`,
    [200],
    { method: "PUT", headers: adminHeaders },
    "admin/reviews unhide portal"
  );

  const approvedAgain = await expectStatus(
    "/api/admin/reviews?status=approved&source=portal",
    [200],
    { headers: adminHeaders },
    "admin/reviews approved portal (after unhide)"
  );
  const approvedAgainRows = Array.isArray(approvedAgain.body) ? approvedAgain.body : [];
  const unhidden = approvedAgainRows.find((row) => Number(row.id) === Number(targetReview.id));
  assert.ok(unhidden, "Unhidden review should return to approved portal list");

  // Delete review and verify it is gone from all portal review lists.
  await expectStatus(
    `/api/admin/reviews/${targetReview.id}?source=portal`,
    [200],
    { method: "DELETE", headers: adminHeaders },
    "admin/reviews delete portal"
  );

  const allPortalAfterDelete = await expectStatus(
    "/api/admin/reviews?status=all&source=portal",
    [200],
    { headers: adminHeaders },
    "admin/reviews all portal (after delete)"
  );
  const allRowsAfterDelete = Array.isArray(allPortalAfterDelete.body) ? allPortalAfterDelete.body : [];
  const deletedStillThere = allRowsAfterDelete.find((row) => Number(row.id) === Number(targetReview.id));
  assert.ok(!deletedStillThere, "Deleted review should not appear in portal review lists");

  // Validate mock upgrade confirm path for payments (admin token + existing job id).
  const jobsBefore = await expectStatus(
    "/api/admin/jobs",
    [200],
    { headers: adminHeaders },
    "admin/jobs list before upgrade"
  );

  const existingJobs = Array.isArray(jobsBefore.body) ? jobsBefore.body : [];
  let targetJob = existingJobs.find((j) => Number(j && j.id) > 0) || null;

  if (!targetJob) {
    const createdJob = await expectStatus(
      "/api/admin/jobs",
      [201],
      {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          title: `Integration Job ${Date.now()}`,
          location: "London",
          job_type: "Full-time",
          category: "IT",
          description: "Integration-created job for payment upgrade flow"
        })
      },
      "admin/jobs create fallback job"
    );

    const jobId = Number(createdJob.body && createdJob.body.id);
    if (!Number.isInteger(jobId) || jobId <= 0) {
      throw new Error("Failed to create fallback job for payment upgrade test");
    }
    targetJob = { id: jobId };
  }

  await expectStatus(
    "/api/payments/confirm",
    [200],
    {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        sessionId: `mock_session_${Date.now()}`,
        mode: "upgrade",
        jobId: Number(targetJob.id)
      })
    },
    "payments/confirm upgrade (mock mode)"
  );

  const jobsAfter = await expectStatus(
    "/api/admin/jobs",
    [200],
    { headers: adminHeaders },
    "admin/jobs list after upgrade"
  );
  const afterRows = Array.isArray(jobsAfter.body) ? jobsAfter.body : [];
  const upgraded = afterRows.find((j) => Number(j.id) === Number(targetJob.id));
  assert.ok(upgraded, "Upgraded job should still exist");
  assert.strictEqual(Number(upgraded.is_premium), 1, "Upgraded job should be premium");

  console.log("\nAll integration validation/security and authenticated flow checks passed.");
}

runIntegrationChecks().catch((err) => {
  console.error("Integration validation/security checks failed:");
  console.error(err.message || err);
  process.exit(1);
});
