# Job Portal

Enterprise Job Portal System developed as part of university coursework.

<<<<<<< HEAD
**Status**: ✅ Ready for demo and deployment (see [docs/DELIVERY_READY_2026-03-27.md](docs/DELIVERY_READY_2026-03-27.md) for details)

Final manual sign-off checklist: [docs/FINAL_SIGNOFF_CHECKLIST_2026-03-28.md](docs/FINAL_SIGNOFF_CHECKLIST_2026-03-28.md)

=======
>>>>>>> d748585d6ba176664da923b31c34be130ff010e7
## GitHub Repository
https://github.com/Mutahar1519/job-portal-website

## Team Members
- Mutahar Yousaf – Backend, Database, Frontend Development
- Hassan Ahmad – Team Leader
- Asfand Yar – Meeting Minutes (Secretary)
- Momina – Documentation and Report Preparation
- Zain – GitHub Repository Management
- Khaja – Team Support and Collaboration



Modern full-stack job portal with role-based access for Job Seekers, Employers, and Administrators.

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: MySQL

## Roles and Permissions
- Job Seeker
- Employer
- Administrator

6. Run production preflight checks (env readiness gate):
```bash
cd backend
npm run test:preflight
```
## Implemented Features
- User registration with role selection (job seeker / employer)
- Admin: `admin@demo.local` / `Demo@1234`
- Employer: `emma@demo.local` / `Demo@1234`
- Job Seeker: `alice@demo.local` / `Demo@1234`
## Go-Live Readiness
- Full deployment checklist: `docs/GO_LIVE_CHECKLIST.md`
- Client demo handoff: `docs/CLIENT_DEMO_HANDOFF.md`
- Job application flows and applicant tracking
- Admin panel for user/job moderation and platform stats
- Modern responsive UI with icons, avatars, tags, hover effects, and animations
- AI Chat Assistant (using free Hugging Face models)

## AI Chat Setup (Free LLM)


1. Sign up for a free account at [Hugging Face](https://huggingface.co)
2. Go to Settings > Access Tokens and create a new token
3. Add the token to your `backend/.env` file:
   ```bash
   HUGGINGFACE_API_KEY=your_token_here
   ```
4. Optionally set a different model:
   ```bash
   HUGGINGFACE_MODEL=microsoft/DialoGPT-medium
   ```

The system falls back to heuristic responses if no API key is provided.

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Update the values in `backend/.env`:
   - Set your database credentials
   - Generate a secure JWT secret
   - Add your Hugging Face API key (already configured)
   - Configure other optional settings

## Environment Setup

1. Copy the `.env` file and update the values:
   ```bash
   cp .env.example .env  # If you have an example file
   # Or create .env with the required variables
   ```

2. Required environment variables:
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database configuration
   - `JWT_SECRET` - For JWT token signing
   - `HUGGINGFACE_API_KEY` - For AI chat (free)
   - `USE_MOCK_PAYMENTS=true` - For development

## Project Structure
- backend/
  - server.js
  - routes/
  - controllers/
  - middleware/
  - sql/
- frontend/
  - *.html
  - css/
  - js/

## Database
Use the canonical schema file if you want a clean setup aligned with the requirement spec:
- backend/sql/job_portal_full_schema.sql

Existing migration files in this repository are also available under:
- backend/sql/users-profiles.sql
- backend/sql/jobs.sql
- backend/sql/applications.sql
- backend/sql/feature-upgrades.sql

## API Health Check
A backend health endpoint is available:
- GET /api/health

Expected response example:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-03-09T15:00:00.000Z"
}
```

## Run Locally
1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Configure MySQL and update env or defaults in backend/config/mysql.js.

3. Run SQL schema/migrations.

4. Start backend (auto-kills existing processes on port 3000):
```bash
cd backend
npm start
```

   Or directly:
   ```bash
   cd backend
   node start.js
   ```

   To start without auto-cleanup:
   ```bash
   cd backend
   npm run start:direct
   ```

5. (Optional) Seed demo accounts and sample data:
```bash
cd backend
npm run seed:demo
```

Demo credentials after seeding:
- Admin: `admin.demo@jobportal.local` / `Admin@123`
- Employer: `employer.demo@jobportal.local` / `Employer@123`
- Job Seeker: `seeker.demo@jobportal.local` / `Seeker@123`

6. Run API smoke tests:
```bash
cd backend
npm run test:smoke
```

7. Start frontend (optional, separate static server on port 3001):
```bash
cd frontend
npm install
npm start
```

8. Open app:
- http://localhost:3000 (backend serves frontend)
- http://localhost:3001 (standalone frontend server)

## UML Documentation
UML diagrams are available in:
- docs/UML.md

Includes:
- Use Case Diagram
- Class Diagram
- Sequence Diagram (Login)
- Activity Diagram (Role Flow)

## Notes
- The repository already contains advanced features beyond baseline scope (reviews, saved jobs, alerts, shift/escrow workflows).
- UI is responsive and optimized for desktop/tablet/mobile layouts.

Final coursework update
