# CW2 Part B Viva Cheat Sheet (1 Page)

## 30-Second Intro
- We built a full-stack Job Portal using Node.js, Express, MySQL, HTML/CSS/JS.
- Final submission focus: stability, security hardening, and test evidence.
- Outcome: codebase is runnable, hardened, and verification-ready.

## What We Fixed (Headline Points)
1. Merge Conflict Cleanup
- Removed 100+ conflict markers across backend/frontend/config/docs.
- Restored syntactically valid, executable code.

2. JWT Security Hardening
- Removed weak fallback secret usage.
- JWT_SECRET is now required.

3. Auth Rate Limiting
- Added endpoint-focused protection for login/register/reset flows.
- Reduced brute-force and credential-stuffing risk.

4. Upload Policy Centralization
- Unified MIME/extension/size checks.
- Consistent rules for resumes, verification docs, and job images.

5. Frontend Error Handling Upgrade
- Replaced scattered alert() calls with reusable error banner utility.
- Better UX and cleaner behavior.

6. Lightweight Unit Testing (No Jest)
- Added plain JavaScript + console.assert tests for required topics.
- Easy one-command execution.

## Required Unit Test Topics (Mapped)
- Email validation
- Password hashing and comparison
- JWT token validation
- Role-based access control
- Job creation validation

## Live Commands To Run
```bash
npm --prefix backend run test:go-live
npm --prefix backend run test:unit:simple:split
```

## Expected Test Output (Summary)
- PASS: Email validation tests
- PASS: Password hashing/comparison tests
- PASS: JWT validation tests
- PASS: RBAC tests
- PASS: Job creation validation tests

## 5 Quick Viva Answers
1. Why no Jest?
- Requirement requested simple unit tests without external frameworks.

2. Biggest security fix?
- Enforced mandatory JWT secret and removed weak fallback secret behavior.

3. How did you verify quality?
- Ran go-live checks, split unit tests, and IDE syntax/problem checks.

4. Why add auth-specific rate limits?
- To protect high-risk auth endpoints from repeated attack patterns.

5. What is improved in upload handling?
- One centralized policy ensures consistent, safer validation rules.

## Closing Line
- We converted a conflict-prone codebase into a secure, testable, submission-ready system with reproducible validation evidence.
