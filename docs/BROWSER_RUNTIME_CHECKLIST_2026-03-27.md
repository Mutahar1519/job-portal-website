# Browser Runtime Checklist (March 27, 2026)

Use this checklist for manual browser verification of flows that were fixed in code but are not fully covered by backend smoke tests.

## Pre-check

- Backend is running and `GET /api/health` returns 200.
- Demo accounts are available:
  - Admin
  - Employer
  - Job seeker
- If testing Google OAuth, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured.

## 1. Job Detail Recovery

- Open `jobs.html` and click a Details button.
- Confirm the detail page loads correctly.
- Refresh the detail page and confirm it still loads.
- Open a detail URL with `?id=<jobId>` and confirm fallback resolution still works.

## 2. Google OAuth

- Open `login.html`.
- Confirm Google button appears when provider is configured.
- Start Google sign-in.
- Confirm redirect returns to `login.html` with token handling.
- Confirm the user lands in the correct destination:
  - Admin -> `admin.html`
  - Employer -> `employer.html`
  - Job seeker -> `dashboard.html`
- Confirm navbar visibility matches the signed-in role.

## 3. Post Job Payment Selector

- Login as employer.
- Open `post-jobs.html`.
- Create a valid premium job draft.
- Confirm payment-method modal appears before checkout.
- Change the selected method and confirm the selected-state UI updates.
- Confirm checkout starts successfully.

## 4. Admin Premium Upgrade Selector

- Login as admin.
- Open `admin.html`.
- Trigger premium upgrade for a non-premium job.
- Confirm payment-method modal appears.
- Change the selected method and confirm the selected-state UI updates.
- Confirm checkout starts successfully.

## 5. Employer Shift Payment Selector

- Login as employer.
- Open `employer.html`.
- Choose a shift application to accept.
- Confirm payment-method modal appears.
- Select a non-default method.
- Confirm the accept flow succeeds.

## 6. Company Reviews and Report Job

- Open a job detail page with a company attached.
- Confirm company reviews list loads.
- Login as job seeker and submit a company review.
- Confirm the success message says review is pending approval.
- Submit a report job request.
- Confirm the report request succeeds.

## 7. Delete Account

- Use a disposable test user only.
- Open `profile.html`.
- Confirm download-data works before deletion.
- Open delete account modal.
- Confirm email-match guard enables the destructive button only when the typed email matches.
- Complete deletion.
- Confirm token and user session are cleared and the app redirects away.
- Confirm the deleted user can no longer log in.

## 8. Final Sanity Pass

- Confirm no obvious console errors appear during the flows above.
- Confirm role-based navigation still behaves correctly after OAuth and normal login.
- Confirm smoke test still passes after any browser-side fixes.