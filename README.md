# Job Portal Website

A full-stack job portal web application where **employers** can post jobs and **job seekers** can search, view, and apply for positions.

---

## 🗂 Project Structure

```
job-portal-website-/
├── backend/               # Node.js + Express REST API
│   ├── config/            # Database connection
│   ├── controllers/       # Route logic (auth, jobs, applications)
│   ├── middleware/        # JWT authentication middleware
│   ├── models/            # Mongoose models (User, Job, Application)
│   ├── routes/            # Express routers
│   ├── .env.example       # Environment variable template
│   ├── package.json
│   └── server.js          # Entry point
├── frontend/              # Vanilla HTML + CSS + JavaScript
│   ├── css/style.css      # Main stylesheet
│   ├── js/
│   │   ├── api.js         # API helper functions
│   │   ├── auth.js        # Auth utilities & navbar
│   │   └── main.js        # Job listings page logic
│   ├── index.html         # Job listings (home page)
│   ├── login.html         # Login page
│   ├── register.html      # Registration page
│   ├── job-detail.html    # Job detail + apply form
│   ├── post-job.html      # Post a job (employer only)
│   └── dashboard.html     # User / employer dashboard
└── database/
    └── schema.sql         # SQL reference schema (PostgreSQL)
```

---

## ⚙️ Tech Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Backend   | Node.js, Express.js         |
| Database  | MongoDB (Mongoose ODM)      |
| Auth      | JWT (jsonwebtoken), bcryptjs|
| Frontend  | HTML5, CSS3, Vanilla JS     |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1 – Clone & install backend dependencies

```bash
cd backend
npm install
```

### 2 – Configure environment variables

```bash
cp .env.example .env
# Edit .env with your values:
#   MONGO_URI  – your MongoDB connection string
#   JWT_SECRET – a long random secret string
#   PORT       – defaults to 5000
```

### 3 – Start the backend server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000`.

### 4 – Open the frontend

Open `frontend/index.html` in your browser (or serve it with any static file server):

```bash
# Example with npx serve
npx serve frontend
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint              | Access  | Description              |
|--------|-----------------------|---------|--------------------------|
| POST   | `/api/auth/register`  | Public  | Register a new user      |
| POST   | `/api/auth/login`     | Public  | Login and get JWT token  |
| GET    | `/api/auth/me`        | Private | Get current user profile |
| PUT    | `/api/auth/profile`   | Private | Update profile           |

### Jobs
| Method | Endpoint        | Access           | Description                   |
|--------|-----------------|------------------|-------------------------------|
| GET    | `/api/jobs`     | Public           | List/search jobs (paginated)  |
| GET    | `/api/jobs/:id` | Public           | Get single job detail         |
| GET    | `/api/jobs/my`  | Employer only    | Get my posted jobs            |
| POST   | `/api/jobs`     | Employer only    | Post a new job                |
| PUT    | `/api/jobs/:id` | Employer (owner) | Update a job                  |
| DELETE | `/api/jobs/:id` | Employer (owner) | Delete a job                  |

### Applications
| Method | Endpoint                         | Access         | Description                    |
|--------|----------------------------------|----------------|--------------------------------|
| POST   | `/api/applications`              | Job Seeker     | Apply for a job                |
| GET    | `/api/applications/my`           | Job Seeker     | Get my applications            |
| GET    | `/api/applications/job/:jobId`   | Employer       | Get applicants for a job       |
| PUT    | `/api/applications/:id/status`   | Employer       | Update application status      |

---

## 🔑 User Roles

| Role        | Capabilities                                              |
|-------------|-----------------------------------------------------------|
| `jobseeker` | Browse jobs, view details, submit applications, dashboard |
| `employer`  | Post jobs, manage listings, review applicants, dashboard  |

---

## 🗄️ Database

- **MongoDB** is the primary database. Mongoose schemas are in `backend/models/`.
- A **SQL reference schema** (PostgreSQL syntax) is provided in `database/schema.sql` for teams that prefer a relational database.

---

## 📸 Pages

| Page              | URL                  | Description                         |
|-------------------|----------------------|-------------------------------------|
| Home / Listings   | `index.html`         | Search & browse all job listings     |
| Job Detail        | `job-detail.html`    | View job info and apply              |
| Login             | `login.html`         | User login                           |
| Register          | `register.html`      | New user registration                |
| Post a Job        | `post-job.html`      | Employer: create a job posting       |
| Dashboard         | `dashboard.html`     | Personalized dashboard (both roles)  |

---

## 📄 License

MIT