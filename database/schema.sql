-- ============================================================
--  Job Portal Database Schema (SQL Reference)
--  Primary database: MongoDB (see backend/models/ for Mongoose schemas)
--  This SQL schema is provided as a relational reference.
-- ============================================================

-- Users table
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100)        NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255)        NOT NULL,
    role        VARCHAR(20)         NOT NULL DEFAULT 'jobseeker' CHECK (role IN ('jobseeker', 'employer')),
    company     VARCHAR(150),
    bio         TEXT,
    resume_url  VARCHAR(500),
    created_at  TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Skills table (normalized)
CREATE TABLE user_skills (
    id      SERIAL PRIMARY KEY,
    user_id INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill   VARCHAR(100) NOT NULL
);

-- Jobs table
CREATE TABLE jobs (
    id                  SERIAL PRIMARY KEY,
    employer_id         INT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR(150)  NOT NULL,
    description         TEXT          NOT NULL,
    company             VARCHAR(150)  NOT NULL,
    location            VARCHAR(150)  NOT NULL,
    job_type            VARCHAR(20)   NOT NULL DEFAULT 'full-time'
                            CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship', 'remote')),
    category            VARCHAR(100)  NOT NULL,
    salary_min          NUMERIC(12,2),
    salary_max          NUMERIC(12,2),
    salary_currency     VARCHAR(10)   DEFAULT 'USD',
    is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
    deadline            DATE,
    applications_count  INT           NOT NULL DEFAULT 0,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Job requirements / skills
CREATE TABLE job_requirements (
    id      SERIAL PRIMARY KEY,
    job_id  INT          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    requirement TEXT     NOT NULL
);

CREATE TABLE job_skills (
    id      SERIAL PRIMARY KEY,
    job_id  INT          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill   VARCHAR(100) NOT NULL
);

-- Applications table
CREATE TABLE applications (
    id           SERIAL PRIMARY KEY,
    job_id       INT         NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    applicant_id INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT,
    resume_url   VARCHAR(500),
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'rejected', 'hired')),
    created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (job_id, applicant_id)
);

-- Indexes for common queries
CREATE INDEX idx_jobs_employer      ON jobs(employer_id);
CREATE INDEX idx_jobs_is_active     ON jobs(is_active);
CREATE INDEX idx_jobs_category      ON jobs(category);
CREATE INDEX idx_jobs_location      ON jobs(location);
CREATE INDEX idx_applications_job   ON applications(job_id);
CREATE INDEX idx_applications_user  ON applications(applicant_id);
CREATE INDEX idx_applications_status ON applications(status);

-- Full-text search index (PostgreSQL)
CREATE INDEX idx_jobs_fts ON jobs
    USING GIN (to_tsvector('english', title || ' ' || description || ' ' || company || ' ' || location));
