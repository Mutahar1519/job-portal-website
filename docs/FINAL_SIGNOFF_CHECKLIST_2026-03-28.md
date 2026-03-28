# Final Demo Sign-off Checklist (2026-03-28)

Use this checklist for one final manual pass before demonstration.

## 1) Automated Gate (must pass first)

Run from backend:

- npm run test:go-live

Pass criteria:

- Preflight passes.
- OAuth config check passes (Google configured, LinkedIn optional).
- Smoke test completes with no failures.

## 2) Startup Reliability Checks

Backend:

- Preferred start command: npm start
- If you used node server.js directly and it exits, restart with npm start.

Frontend standalone (optional):

- In frontend: npm install
- In frontend: npm start
- Open http://localhost:3001

Pass criteria:

- Backend responds at http://localhost:3000/api/health
- Login page opens from backend-served UI at http://localhost:3000/login.html
- Optional standalone frontend opens at http://localhost:3001

## 3) Role Walkthrough (manual)

### Job seeker

- Login with seeker demo account.
- Open dashboard and verify tabs load, including Interviews.
- Open Jobs list and a Job detail page.
- Submit one job application.
- Verify duplicate application is blocked with clear message.
- Open profile and resume page; verify resume view/upload behavior.

### Employer

- Login with employer demo account.
- Post a normal job and confirm it appears in employer jobs.
- Open pipeline and verify candidate list loads.
- Schedule interview for an applicant.
- Verify candidate-side interview visibility, countdown, and calendar actions.

### Admin

- Login with admin demo account.
- Open admin jobs and review queues.
- Approve a pending job or review and verify status updates.
- Open support inbox and verify ticket/thread load.

Pass criteria:

- No blocking UI errors for core role flows.
- Status transitions are reflected after refresh.

## 4) Payments and Premium Flows

- Trigger premium checkout session creation.
- Trigger donation checkout session creation.
- Verify both endpoints return checkout URL successfully.

Pass criteria:

- Session creation succeeds for both flows.
- Redirect URLs are valid and reachable.

## 5) Candidate Confidence Checks

- Interviews tab shows scheduled items (if present).
- ICS download works for interview entries.
- Google/Outlook quick links open with populated event data.
- Background check timeline chips render correctly.
- Reminder settings persist across reload (enable and lead time).

Pass criteria:

- Interview and background check widgets render without console-breaking errors.
- Reminder behavior follows configured lead time.

## 6) Final Acceptance Decision

Mark final demo as Ready only if all below are true:

- Automated gate passed.
- Startup reliability checks passed.
- Job seeker, employer, and admin walkthroughs passed.
- Payment session creation passed.
- Candidate interview/background-check UX checks passed.

If one item fails, capture:

- exact failing step
- visible error message
- endpoint or page involved
- reproducible steps (short)

Then fix and rerun this checklist from section 1.
