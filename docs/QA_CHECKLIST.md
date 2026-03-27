# Job Portal QA Checklist

Use this checklist before demo or deployment.

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
- [ ] Employer can edit/delete own job.
- [ ] Employer pipeline loads applications.
- [ ] Employer can update candidate stage.

## 5. Admin Flow
- [ ] Admin login works.
- [ ] View users list.
- [ ] View jobs list.
- [ ] Edit/delete jobs.
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

## 9. Demo Readiness
- [ ] Seed at least 5 sample jobs.
- [ ] Seed 1 employer + 1 job seeker + 1 admin test account.
- [ ] Verify one end-to-end apply flow before demo.
- [ ] Prepare fallback screenshots in case of network issues.

## 10. Final GO/NO-GO Runbook (March 2026)

Use this as the final release script before saying "100% ready".

### 10.1 Automated Gate (must pass)
- [ ] `cd backend && npm run test:smoke` returns success.
- [ ] `cd backend && set GO_LIVE_STRICT=1 && npm run test:go-live` returns success.
- [ ] `cd backend && npm run test:oauth-config` returns success.

Expected notes:
- `apply-job -> 400` can still be acceptable in smoke if duplicate/invalid sample apply state is hit.
- Go-live gate must still end with `All go-live checks passed.`

### 10.2 Job Seeker Click Path (manual)
1. Open `frontend/index.html` and go to Jobs.
2. Search and filter jobs, then open a job detail page.
3. Apply to a job as seeker.
4. Open dashboard and confirm application appears.

Expected result:
- Job detail opens for anonymous and logged-in states.
- Apply action gives success or graceful "already applied" response.
- Dashboard reflects application state.

### 10.3 Employer Click Path (manual)
1. Login as employer and open `frontend/employer.html`.
2. Select a job in pipeline and open candidate card actions.
3. For shift application, click Accept shift.
4. In payment modal:
	- verify methods: Card, Apple Pay, Google Pay, PayPal, Bank Transfer.
	- verify keyboard support: arrows, Home/End, Enter/Space, Escape.
	- verify selected text and checkmark update.
5. Confirm selection and complete shift accept action.

Expected result:
- Shift accept endpoint succeeds with selected `payment_method`.
- Selected payment method is shown in success feedback.

### 10.4 Admin Click Path (manual)
1. Login as admin and open `frontend/admin.html`.
2. Open review moderation queue.
3. Switch source filter across Portal, Company, and All Sources.
4. Execute approve/hide/unhide/delete actions on sample records.

Expected result:
- Actions apply correctly to both review sources.
- Queue refreshes and reflects updated status.

### 10.5 Shift Alerts and Notifications (manual)
1. Open dashboard and locate Shift Alerts section.
2. Create alert with keyword/location/category/frequency.
3. Edit existing alert, toggle active/inactive, and delete one.

Expected result:
- CRUD operations work without reload issues.
- Active filters only show relevant open shift notifications.

### 10.6 Release Decision Rule
- GO only if all automated checks pass AND all four manual role paths pass.
- NO-GO if any auth, payment, moderation, or apply flow has blocking errors.
