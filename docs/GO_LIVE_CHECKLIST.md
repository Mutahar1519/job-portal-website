# Go-Live Checklist

## 1. Environment
- Set `NODE_ENV=production`.
- Set a strong `JWT_SECRET` (do not use defaults).
- Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- Set `CORS_ORIGINS` to your real frontend domain(s), comma-separated.
- Set SMTP values (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) for password reset, verification, and application notifications.
- Set `ADMIN_EMAIL` for operational alerts and notification fallback.
- If using social login, set OAuth values: `OAUTH_BASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- LinkedIn is optional: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`.
- Optional but recommended:
  - `HUGGINGFACE_API_KEY` for AI chat quality.
  - `STRIPE_SECRET_KEY` for real payments.

### 1.1 OAuth Provider Setup (Google required, LinkedIn optional)
- Add these values in `backend/.env`:
  - `OAUTH_BASE_URL=https://api.yourdomain.com` (your backend public base URL)
  - `GOOGLE_CLIENT_ID=...`
  - `GOOGLE_CLIENT_SECRET=...`
  - `LINKEDIN_CLIENT_ID=...` (optional)
  - `LINKEDIN_CLIENT_SECRET=...` (optional)
- Google Console redirect URI:
  - `https://api.yourdomain.com/api/auth/google/callback`
- LinkedIn App redirect URI (optional):
  - `https://api.yourdomain.com/api/auth/linkedin/callback`
- Local development redirect URIs (if needed):
  - `http://localhost:3000/api/auth/google/callback`
  - `http://localhost:3000/api/auth/linkedin/callback`
- Verify provider flags after deploy:
  - `GET /api/auth/providers` should return `{"google":true,"linkedin":true}` when configured.

## 2. Database
- Apply schema using `backend/sql/job_portal_full_schema.sql`.
- Run `node backend/initDb.js` only when initializing/resetting.
- Seed demo data only in non-production: `npm run seed:demo`.

## 3. Validation Commands
From `backend`:

```bash
npm run test:preflight
npm run test:smoke
npm run test:go-live
```

All should pass before deployment.

- `npm run test:go-live` runs a full gate:
  - starts backend automatically if not running,
  - runs preflight,
  - runs smoke tests,
  - checks OAuth providers endpoint,
  - checks report-job endpoint.
- For strict production env validation:
  - `GO_LIVE_STRICT=1 npm run test:go-live`

## 4. Runtime
- Start backend behind a process manager (PM2, systemd, Docker restart policy).
- Serve frontend over HTTPS.
- Put backend behind a reverse proxy (Nginx/Caddy) with TLS.
- Enable log rotation and basic monitoring.

## 5. Functional Acceptance
- Register, login, logout.
- Google login (LinkedIn optional).
- Forgot/reset password.
- Search and filter jobs.
- Job details and apply flow.
- Employer post job flow.
- Admin pages and moderation actions.
- Review submission.
- Profile update, photo upload, CV upload, resume parser path.
- Download profile data and delete account.
- AI chat response.

## 6. Security
- Do not commit real `.env` secrets.
- Keep uploads folder writable but restricted.
- Keep CORS allowlist minimal in production.
- Ensure backups for MySQL and uploads are scheduled.
