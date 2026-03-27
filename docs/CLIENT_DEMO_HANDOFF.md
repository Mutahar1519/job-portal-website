# Client Demo Handoff (Job Portal)

Date: 2026-03-26

## 1) What Is Ready
- Multi-role platform: Job Seeker, Employer, Admin.
- Core job lifecycle: post, browse, detail, apply, track.
- Admin moderation and premium controls.
- AI chat assistant via Hugging Face with graceful fallback responses.
- Payments wired for `card`, `applepay`, `gpay`, `paypal`, `bank_transfer`.
- Account self-service supports data access and account deletion.

## 2) Verified Test Evidence
From backend:

```bash
npm run test:preflight
npm run test:smoke
```

Latest status:
- Preflight: passed
- Smoke: passed (including auth, jobs, profile, reviews, AI chat, admin endpoints)
- Payment API checks: accepted methods return 200; invalid methods return 400

## 3) Live Demo Script (10-12 minutes)
1. Login as Job Seeker (`alice@demo.local`).
2. Search jobs and open a detail page.
3. Start apply flow; show "already applied" protection if applicable.
4. Show optional donation payment method selection in apply flow.
5. Login as Employer (`emma@demo.local`) and post a premium job.
6. Show payment method selection during premium checkout creation.
7. Login as Admin and upgrade an existing job to premium.
8. Show admin user and application management.
9. Trigger AI assistant and show response.
10. Show profile/account settings including delete-account path.

## 4) Client Q&A Quick Answers
- Q: Are Apple Pay/Google Pay/PayPal/bank transfer supported?
  A: Yes. The backend validates method choices and maps them to Stripe-compatible checkout types.

- Q: What if a selected method is not enabled on Stripe account?
  A: Checkout gracefully falls back to `card` and returns a warning message.

- Q: Is invalid payment input blocked?
  A: Yes. Invalid methods are rejected with HTTP 400.

- Q: Is this production-safe?
  A: Code path is ready. Production cutover still requires real secrets and infra settings.

## 5) Production Cutover Checklist (Must-Do)
1. Set real `STRIPE_SECRET_KEY` and enable required methods in Stripe dashboard.
2. Configure SMTP credentials for real email delivery.
3. Set strong `JWT_SECRET`.
4. Set strict `CORS_ORIGINS` to production domains only.
5. Run behind HTTPS + reverse proxy + process manager.
6. Run preflight and smoke in production-like environment before launch.

## 6) Demo Credentials (Current Seed)
- Admin: `admin@demo.local` / `Demo@1234`
- Employer: `emma@demo.local` / `Demo@1234`
- Job Seeker: `alice@demo.local` / `Demo@1234`

## 7) Known Environment Note
If `STRIPE_SECRET_KEY` is missing, payment routes run in mock mode by design. This is expected for development and demos without live Stripe billing.
