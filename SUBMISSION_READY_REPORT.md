# Job Portal CW2 Part B - Final Submission Report

## Verified Final State

Status: READY FOR SUBMISSION
Generated: April 10, 2026

This report reflects the current validated state of the codebase after conflict cleanup, runtime stabilization, and final verification runs.

## Completed Work

1. Merge and parser cleanup completed across backend and frontend modules.
2. Backend startup blockers fixed (missing route/controller handler wiring issues).
3. Frontend script integrity restored where corruption/merge artifacts had broken runtime behavior.
4. Smoke/go-live stability improved by fixing brittle checks and required page markers.
5. Lightweight split unit tests are present and passing.
6. Controller unit test layer added (in addition to existing simple split tests), with a dedicated runner and npm script.
7. All `alert()` calls (232 total) replaced with semantic `showError()` / `showSuccess()` / `showWarning()` banner calls; `error-ui.js` added to every HTML page that was missing it.

## Validation Evidence

### 1. IDE/diagnostics
- Workspace diagnostic check reports no current editor errors.

### 2. Conflict marker verification
- Strict scan for unresolved markers (`<<<<<<<`, `=======`, `>>>>>>>`) in project source returned no unresolved markers.

### 3. Unit tests
- Command run: `npm --prefix backend run test:unit:simple:split`
- Result: PASS
  - Email validation tests
  - Password hashing/comparison tests
  - JWT validation tests
  - RBAC tests
  - Job creation validation tests

### 3b. Controller unit tests
- Command run: `npm --prefix backend run test:unit:controllers`
- Result: PASS
  - applicationsController
  - chatController
  - companiesController
  - employerController
  - jobAlertsController
  - jobsController
  - messagesController
  - notificationsController
  - recommendationsController
  - referralsController
  - resumesController
  - reviewsController
  - savedJobsController
  - shiftsController
  - usersController

### 4. Go-live gate
- Command run: `npm --prefix backend run test:go-live`
- Final result: PASS
  - preflight: PASS
  - oauth-config: PASS
  - smoke: PASS

Note: One intermediate go-live attempt failed only because the backend server was not running when smoke started. After starting backend, the same go-live command passed end-to-end.

## Artifacts and Notes

- Viva preparation notes:
  - docs/VIVA_NOTES_2026-04-10.md
  - docs/VIVA_CHEAT_SHEET_2026-04-10.md

## Non-Blocking Accuracy Notes

1. Legacy weak hardcoded-secret references were removed from active scripts/docs during final cleanup; current JWT usage is documented as environment-driven.

## Submission Checklist

- [x] Project starts and serves expected routes
- [x] Backend go-live gate passes
- [x] Split unit tests pass
- [x] Controller unit tests pass (15 controllers)
- [x] No unresolved merge markers in source files
- [x] Core frontend/backend pages and APIs respond in smoke coverage
- [x] All alert() calls replaced with semantic banner notifications
- [x] error-ui.js included in all HTML pages
- [x] Report aligned with current evidence

## Final Recommendation

Proceed with submission using this evidence-backed state. All previously identified non-blocking tasks have been completed.
