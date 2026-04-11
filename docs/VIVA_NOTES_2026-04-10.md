# Viva Notes (CW2 Part B)

## 1-2 Minute Opening Script

Good morning. Our project is an enterprise-style Job Portal built with Node.js, Express, MySQL, and a responsive frontend.

For this final submission, we focused on stability, security hardening, and demonstrable verification.

First, we resolved a major merge issue where 100+ conflict markers across many files made the system unstable. We cleaned backend routes, controllers, middleware, frontend pages, JavaScript, and CSS to restore a runnable codebase.

Second, we hardened authentication security by removing weak JWT fallback secrets and requiring JWT_SECRET from environment configuration. This prevents insecure defaults in production-style environments.

Third, we added auth-specific rate limiting to login, registration, and password-reset flows to reduce brute-force and credential-stuffing risk.

Fourth, we centralized upload validation into one policy utility so allowed file types and size limits are consistent across resume uploads, verification documents, and job images.

Fifth, we improved user experience by replacing scattered alert-based frontend errors with a reusable error UI module that supports clear severity states and auto-dismiss behavior.

Finally, for testing requirements, we added lightweight no-Jest unit tests using plain JavaScript and console.assert. These cover email validation, password hashing/comparison, JWT validation, role-based access control, and job creation validation. Tests run with one command and pass successfully.

Overall, this submission demonstrates engineering cleanup, security improvements, and practical testability while preserving core recruitment workflows.

## Quick Demo Flow (Suggested)

1. Run backend go-live checks and mention pass result.
2. Run simple split unit tests and show PASS lines for all five required areas.
3. Open report and point to requirement-to-test mapping appendix.
4. Briefly explain one security improvement (JWT secret enforcement or auth rate limiting).

## Common Examiner Questions (With Short Answers)

1. Why did you avoid Jest?
- Requirement asked for simple unit tests without external frameworks. We implemented plain Node.js tests using console.assert for easy integration and transparency.

2. How is JWT security improved?
- We removed hardcoded fallback secrets and made JWT_SECRET mandatory. Startup fails clearly if misconfigured, which prevents insecure deployments.

3. How did you verify your changes?
- We ran targeted scripts, including go-live checks and the simple split unit test runner. We also validated modified files for syntax and IDE issues.

4. What does rate limiting protect against?
- It reduces repeated abusive attempts on auth endpoints, especially brute-force login and credential-stuffing patterns.

5. What makes your upload validation safer now?
- One centralized policy enforces MIME/extension/size constraints consistently, reducing bypass risk from inconsistent per-route checks.

## Commands To Show During Viva

```bash
npm --prefix backend run test:go-live
npm --prefix backend run test:unit:simple:split
```

## Unit Test Files To Mention

- backend/unit-tests/simple/emailValidation.simple.test.js
- backend/unit-tests/simple/passwordHashing.simple.test.js
- backend/unit-tests/simple/jwtValidation.simple.test.js
- backend/unit-tests/simple/rbac.simple.test.js
- backend/unit-tests/simple/jobCreationValidation.simple.test.js
- backend/unit-tests/simple/run-all.simple.test.js

## Closing Line

In summary, we moved the project from conflict-prone and risky defaults to a secure, testable, submission-ready state with clear evidence and reproducible validation.
