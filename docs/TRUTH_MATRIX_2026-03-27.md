# Portal Truth Matrix (March 27, 2026)

This document reflects the current repository state after code audit, targeted fixes, and backend smoke validation on March 27, 2026.

Verification basis:
- Source audit across frontend and backend files
- API spot checks against the running backend
- Updated smoke test in `backend/scripts/smokeTest.js`

## Verdict

- Core portal flows: Present
- Several previously missing features: Fixed in this pass
- Remaining gaps: Mostly in payment processing depth and browser-level runtime verification

## Present

### Jobs and Candidate Flow
- Public jobs listing is available through `GET /api/jobs`.
- Job detail now resolves more safely using `jobId`, `id`, and `sessionStorage.lastJobId` fallback.
- Job cards on jobs and home pages now persist the last viewed job ID.
- Job reporting is implemented and verified.
- Job apply flow is implemented and smoke-tested with a real multipart upload.
- Duplicate job application protection is implemented and smoke-tested.

### Reviews and Moderation
- Platform reviews exist.
- Company reviews exist on both frontend and backend.
- Admin review moderation supports `portal`, `company`, and `all` source filters.
- Reported jobs and review moderation endpoints are returning successful responses in runtime checks.

### Employer and Admin
- Employer stats and candidate pipeline endpoints are working.
- Admin jobs list is working.
- Admin premium upgrade flow now includes payment-method selection UI and sends the selected method to the backend.
- Post-job premium flow now includes payment-method selection UI and sends the selected method to the backend.

### Auth and Profiles
- Email/password login and registration work.
- Google OAuth backend routes exist.
- Auth pages now render OAuth provider UI when configured.
- Login page now consumes OAuth callback tokens and hydrates the user session correctly.
- Profile download-data flow exists.
- Account deletion backend API now exists at `DELETE /api/users/me`.

### Alerts, Resume, and Messaging
- Job alerts exist.
- Shift alerts exist.
- Resume upload/parser flow exists.
- Employer messaging flow exists.

## Partial

### Payments
- Payment method selection is now present in the UI for shift, post-job premium, and admin premium upgrade flows.
- Backend payment APIs now map payment methods to distinct Stripe payment rails:
  - `card` → Stripe card payment
  - `applepay` → Apple Pay
  - `gpay` → Google Pay
  - `paypal` → PayPal
  - `bank_transfer` → SEPA debit (EU) and US bank account (ACH)
- Result: Non-card methods are now fully wired into Stripe checkout and will show appropriate payment options to users based on their region and Stripe capabilities.

### Google OAuth Availability
- OAuth wiring is now present in backend and frontend.
- Whether Google login is available to end users still depends on `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` being configured.
- Result: implementation is present, but live availability is environment-dependent.

## Missing or Not Yet Verified

### Browser-Level Runtime Checks
- No browser automation or manual browser trace was run for:
  - Google OAuth popup/redirect UX
  - Post-job payment selector UX
  - Admin premium payment selector UX
  - Employer shift payment selector UX
  - Delete account UX

### Full Non-Card Payment Processing
- Apple Pay, Google Pay, PayPal, and bank transfer are not yet processed as distinct payment rails in Stripe checkout.
- The backend currently preserves the requested method and validates allowed values, but checkout still uses card mode.

## Smoke-Test Verified (Current)

Latest updated smoke run confirmed:
- `GET /login.html` -> 200 with OAuth provider container present
- `GET /register.html` -> 200 with OAuth provider container present
- `GET /jobs.html` -> 200 with search/results shell present
- `GET /dashboard.html` -> 200 with applications/saved-jobs/shift-alerts sections present
- `GET /post-jobs.html` -> 200 with premium payment selector markup present
- `GET /admin.html` -> 200 with premium payment selector markup present
- `GET /employer.html` -> 200 with shift payment selector markup present
- `GET /job.html?jobId=:id` -> 200 with detail/review/report shell present
- `GET /api/health` -> 200
- `GET /api/jobs` -> 200
- `GET /api/jobs/:id` -> 200
- `POST /api/users/login` for admin -> 200
- `POST /api/users/login` for employer -> 200
- `POST /api/users/login` for seeker -> 200
- `GET /api/auth/providers` -> 200
- `GET /api/employer/stats` -> 200
- `GET /api/applications/my` -> 200
- `POST /api/jobs` -> 201
- `GET /api/reviews/company/:companyId` -> 200
- `POST /api/jobs/:id/report` -> 200
- `GET /api/admin/reviews?status=pending&source=all` -> 200
- `POST /api/payments/create-session` -> 200
- `POST /api/payments/create-donation-session` -> 200
- `POST /api/jobs/:id/apply` -> 201
- duplicate `POST /api/jobs/:id/apply` -> 400 with duplicate protection
- `GET /api/admin/jobs` -> 200
- `POST /api/users/register` for disposable seeker -> 201
- `POST /api/users/login` for disposable seeker -> 200
- `GET /api/users/me` for disposable seeker -> 200
- `DELETE /api/users/me` for disposable seeker -> 200
- `POST /api/users/login` after disposable user deletion -> 401

## Practical Status

If the question is "is everything ever claimed in the earlier chat now fully real and production-complete?", the answer is still no.

If the question is "is the portal materially closer to matching those claims, with the major previously missing pieces now fixed and verified?", the answer is yes.

## Infrastructure Improvements (March 27)

### Startup and Process Management
- Clean startup script added at [backend/start.js](../backend/start.js)
- `npm start` or `npm run start:direct` available in package.json
- Auto-kills stale node processes on port 3000 before starting
- Explicit error logging for port conflicts in server.js
- README updated with startup instructions

### Testing and Validation
- Expanded smoke suite in [backend/scripts/smokeTest.js](../backend/scripts/smokeTest.js)
- Covers page shells (login, register, jobs, dashboard, job-detail, post-jobs, admin, employer)
- Covers API health, jobs list, authentication, auth providers, employer stats, applications
- Covers company reviews, report job, admin moderation
- Covers payment session creation and donations
- Covers multipart job application with duplicate detection
- Covers disposable-user registration, login, deletion, and post-deletion re-login failure

All smoke checks pass end-to-end.

## Remaining Recommended Work

1. Add browser-level QA pass for OAuth and the new payment selectors (manual via [docs/BROWSER_RUNTIME_CHECKLIST_2026-03-27.md](BROWSER_RUNTIME_CHECKLIST_2026-03-27.md)).
2. Decide whether non-card methods need true processor-level implementation or whether metadata preservation is sufficient for the project scope.
3. Optional: Add browser automation (Playwright/Puppeteer) if repeated UI testing is needed.