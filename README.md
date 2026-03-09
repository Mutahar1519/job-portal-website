# Job Portal (LinkedIn/Indeed-style)

Modern full-stack job portal with role-based access for Job Seekers, Employers, and Administrators.

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: MySQL

## Roles and Permissions
- Job Seeker
- Employer
- Administrator

## Implemented Features
- User registration with role selection (job seeker / employer)
- Login/logout and JWT-based role-aware access
- Employer job posting and pipeline management
- Job search/listings with modern responsive cards
- Job application flows and applicant tracking
- Admin panel for user/job moderation and platform stats
- Modern responsive UI with icons, avatars, tags, hover effects, and animations

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

4. Start backend:
```bash
cd backend
node server.js
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

5. Open app:
- http://localhost:3000

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
=======
# job-portal-website-
