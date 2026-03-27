# Job Portal QA Checklist

Use this checklist before demo or deployment.

Reference documents:
- Current audited feature state: `docs/TRUTH_MATRIX_2026-03-27.md`
- Browser runtime sweep: `docs/BROWSER_RUNTIME_CHECKLIST_2026-03-27.md`

## 1. Environment and Services
- [ ] MySQL service is running.
- [ ] Database `job_portal` exists.
- [ ] Required tables are present.
- [ ] Backend starts without crash.
- [ ] Health endpoint works: `GET /api/health`.

## 2. Authentication
- [ ] Register as Job Seeker.
- [ ] Register as Employer.
- [ ] Login works for both roles.
- [ ] Google OAuth button appears when provider is configured.
- [ ] Google OAuth callback lands in the correct role page with a hydrated session.
- [ ] Logout clears session and redirects correctly.
- [ ] Role-based navigation visibility is correct.

## 3. Job Seeker Flow
- [ ] Search jobs by keyword.
- [ ] Filter by category/location/type.
- [ ] Open job detail page.
- [ ] Apply to a job successfully.
- [ ] See applied jobs in dashboard.

## 4. Employer Flow
- [ ] Employer can create company profile.
- [ ] Employer can post job.
- [ ] Premium job selector shows payment method choices and starts checkout.
- [ ] Employer can edit/delete own job.
- [ ] Employer pipeline loads applications.
- [ ] Employer can update candidate stage.
- [ ] Employer shift acceptance sends selected payment method.

## 5. Admin Flow
- [ ] Admin login works.
- [ ] View users list.
- [ ] View jobs list.
- [ ] Edit/delete jobs.
- [ ] Admin premium upgrade selector shows payment method choices and starts checkout.
- [ ] Access stats and moderation screens.

## 6. UI/UX Validation
- [ ] Navbar active item is highlighted and underlined.
- [ ] Hero sections render correctly on mobile/desktop.
- [ ] Job cards show avatar/logo, tags, and action buttons.
- [ ] Hover animations are smooth.
- [ ] Pages are responsive (desktop/tablet/mobile).
- [ ] 404 and 500 pages are styled and navigable.

## 7. API Smoke Tests (quick)
- [ ] `GET /` returns 200.
- [ ] `GET /jobs.html` returns 200.
- [ ] `GET /api/jobs` returns 200.
- [ ] `GET /api/health` returns status ok and database connected.

## 8. Security and Data
- [ ] Passwords are hashed in DB.
- [ ] JWT-protected routes reject invalid/empty tokens.
- [ ] SQL scripts used are versioned under `backend/sql`.
- [ ] No production secrets hardcoded.
- [ ] Delete account flow is verified on a disposable test user.

## 9. Demo Readiness
- [ ] Seed at least 5 sample jobs.
- [ ] Seed 1 employer + 1 job seeker + 1 admin test account.
- [ ] Verify one end-to-end apply flow before demo.
- [ ] Prepare fallback screenshots in case of network issues.
