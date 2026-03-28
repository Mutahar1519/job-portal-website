# Job Portal Add-ons Implementation Plan

## Overview
Comprehensive plan to add 13 new features to the job portal to increase user engagement, employer value, and revenue.

---

## Phase 1: Foundation Features (High ROI)
**Timeline: 2-3 days | Impact: Immediate engagement boost**

### 1. Email Notifications System ⭐⭐⭐
**What**: Send automated emails on job alerts, application updates, support replies, saved job changes
**Status**: NOT STARTED
**Effort**: Medium (2-3 hours)
**Tables to Create**:
- `email_notifications` - Track sent emails
- `user_notification_preferences` - User opt-in/out settings

**API Endpoints**:
- `POST /api/notifications/preferences` - Set user email preferences
- `GET /api/notifications/preferences` - Get user settings
- `POST /api/notifications/send-test` - Test email

**Features**:
- Job alert emails (when new jobs match filters)
- Application status change emails
- Support ticket replies
- Unsubscribe management
- Email templates with branding

---

### 2. Advanced Job Search Filters ⭐⭐⭐
**What**: Salary range, experience level, job type, benefits, skills, saved searches
**Status**: NOT STARTED
**Effort**: Medium (4-5 hours)
**Tables to Create**:
- `advanced_job_filters` - Store saved filter sets per user
- Add to `jobs` table: `salary_min`, `salary_max`, `job_type` (full-time, part-time, contract, etc.)
- Add to `jobs` table: `benefits` JSON field (remote, flexible, health insurance, etc.)

**API Endpoints**:
- `GET /api/jobs/advanced-search` - Search with filters
- `POST /api/jobs/filters/save` - Save filter set
- `GET /api/jobs/filters` - List saved filters
- `DELETE /api/jobs/filters/:id` - Delete filter

**Frontend**:
- Advanced filter sidebar
- Salary range slider
- Experience level checkboxes
- Job type multi-select
- Benefits checkboxes
- Saved searches dropdown

---

### 3. Job Recommendations Engine ⭐⭐⭐
**What**: ML-based job matching based on profile, experience, saved jobs, applications
**Status**: NOT STARTED
**Effort**: High (6-8 hours)
**Algorithm**:
1. Analyze user's profile: skills, experience, preferences
2. Analyze applied jobs: what they apply for
3. Analyze saved jobs: what they're interested in
4. Score all jobs by similarity (0-100)
5. Return top 10 unviewed, unapplied jobs

**Tables to Create**:
- `job_recommendations` - Cache recommendations for performance

**API Endpoints**:
- `GET /api/recommendations/jobs` - Get personalized recommendations (max 10)
- `POST /api/recommendations/dismiss/:jobId` - User dismisses a recommendation

**Frontend**:
- "Recommended For You" section on dashboard
- Job cards with match percentage
- "Dismiss" button per recommendation
- "Learn more" link to job details

---

## Phase 2: Employer/Candidate Tools
**Timeline: 2-3 days | Impact: Premium features for monetization**

### 4. Employer Analytics Dashboard ⚡⚡⚡
**What**: Job performance metrics, views, applications, conversion rates
**Status**: NOT STARTED
**Effort**: High (6-8 hours)
**Tables to Create**:
- `job_analytics` - Track views, clicks, applications per job per day
- `job_view_events` - Individual view logs (optional, for detailed tracking)

**API Endpoints**:
- `GET /api/employer/jobs/:jobId/analytics` - Get metrics for a job
- `GET /api/employer/analytics/dashboard` - Overall stats
- `GET /api/employer/analytics/pipeline` - Hiring pipeline status

**Metrics to Display**:
- Total views, unique viewers, CTR (click-through rate)
- Applications received, conversion rates
- Time-to-first-application
- Application-to-hire conversion
- Source of applicants (direct, search, recommendations, etc.)

**Frontend**:
- Analytics dashboard with charts
- Job performance comparison
- Pipeline kanban board (applications by status)

---

### 5. Candidate Ranking & Interview Tracking ⚡⚡
**What**: Employers score applicants, shortlist, track interview status
**Status**: NOT STARTED
**Effort**: High (6-8 hours)
**Tables to Create**:
- Add to `applications` table: `score` (0-100), `interview_status`, `interview_notes`
- `application_ratings` - Track employer ratings per candidate

**API Endpoints**:
- `PUT /api/applications/:id/score` - Set candidate score
- `PUT /api/applications/:id/interview-status` - Update interview status (Not Started, Scheduled, Completed, Offered, Rejected)
- `PUT /api/applications/:id/notes` - Add interview notes
- `GET /api/applications?status=interview_scheduled` - Filter by interview status

**Frontend**:
- Score slider on each application
- Interview status dropdown
- Notes text area
- Shortlist view (filter by top scores)
- Interview calendar

---

### 6. Company Pages ⚡⚡
**What**: Public company profiles separate from individual job posts
**Status**: NOT STARTED
**Effort**: High (6-8 hours)
**Tables to Create**:
- `company_profiles` - Logo, description, social links, founding year, size
- `company_reviews` - Reviews from candidates about working at company

**API Endpoints**:
- `GET /api/companies/:id` - Get company profile
- `PUT /api/companies/:id` - Employer updates company info
- `GET /api/companies/:id/jobs` - All jobs from company
- `POST /api/companies/:id/reviews` - User leaves review
- `GET /api/companies/:id/reviews` - Get reviews

**Frontend**:
- Company profile page with logo, description, social links
- Job listings filtered by company
- Review section
- "Follow Company" button
- Link from job cards to company profile

---

## Phase 3: Advanced Features
**Timeline: 3-4 days | Impact: Long-term engagement & monetization**

### 7. Job Expiration & Auto-Renewal ⚡
**What**: Jobs automatically expire after 30 days, employers can renew with one click
**Status**: NOT STARTED
**Effort**: Medium (3-4 hours)
**Tables to Create**:
- Add to `jobs` table: `expires_at`, `renewal_count`, `last_renewed_at`

**API Endpoints**:
- Cron job to mark expired jobs as inactive
- `PUT /api/employer/jobs/:id/renew` - Renew job
- `GET /api/employer/jobs?status=expiring_soon` - Show expiring jobs

**Email Notifications**:
- 7 days before expiration: "Your job is expiring soon"
- On expiration: "Your job has expired"

---

### 8. Salary Insights 💰
**What**: Show salary ranges, auto-populate from market data, comparison tools
**Status**: NOT STARTED
**Effort**: Medium (4-5 hours)
**Tables**:
- Add to `jobs`: `salary_min`, `salary_max`, `salary_currency`
- `salary_benchmarks` - Industry/role/location salary data

**Features**:
- Salary range on job cards
- Salary comparison filter
- Salary insights page (avg salary by role, location, experience)
- Report: "Salary trends in your field"

---

### 9. Referral Bonus Program 🎁
**What**: Users refer candidates who get hired, earn rewards/credit
**Status**: NOT STARTED
**Effort**: Medium (4-5 hours)
**Tables to Create**:
- `referrals` - Track referral relationships
- `referral_rewards` - Track earned rewards/balance

**API Endpoints**:
- `POST /api/referrals/create` - User refers someone
- `GET /api/referrals/my-referrals` - View user's referrals
- `GET /api/referrals/rewards` - View earned rewards
- `PUT /api/referrals/:id/mark-hired` - Admin marks hire completed

---

### 10. Interview Scheduling ✅
**What**: Calendar integration, schedule interviews, video call links
**Status**: NOT STARTED
**Effort**: Very High (8-10 hours)
**External Integrations**:
- Google Calendar API
- Zoom API (for video interviews)
- Google Meet API (alternative)

**Tables to Create**:
- `interview_slots` - Available times from employer
- `interviews_scheduled` - Actual scheduled interviews

**Features**:
- Check employer's available times
- Candidate books a time
- Auto-send calendar invites
- Video call link (Zoom/Google Meet)
- Reminder emails

---

### 11. Background Check Integration ✅
**What**: Partner API for background checks
**Status**: NOT STARTED
**Effort**: High (6-8 hours)
**External Integration**:
- Use a BG check API (e.g., Checkr, Clarity, Sterling)

**Tables**:
- `background_checks` - Track BG check orders and status

**API Endpoints**:
- `POST /api/background-checks/order` - Employer orders BG check
- `GET /api/background-checks/:id/status` - Check status
- `GET /api/background-checks/:id/results` - Get results (once complete)

---

### 12. Skills Endorsement System 👍
**What**: Users can endorse/verify candidate skills on public profiles
**Status**: NOT STARTED
**Effort**: Medium (4-5 hours)
**Tables**:
- `skill_endorsements` - Track who endorsed which skill

**API Endpoints**:
- `POST /api/skills/endorse` - Endorse a user's skill
- `GET /api/users/:id/endorsed-skills` - Get endorsed skills count
- `PUT /api/users/:id/skills` - User manages their skills list

---

### 13. Bulk Job Posting 📤
**What**: Upload CSV with multiple jobs, template-based creation, batch management
**Status**: NOT STARTED
**Effort**: High (6-8 hours)
**Features**:
- CSV upload (title, description, salary, location, etc.)
- Job template system
- Batch edit (edit all uploaded jobs at once)
- Batch pause/publish/delete
- Validation before upload (required fields, max length, etc.)

---

## Implementation Priority Matrix

| Feature | ROI | Effort | Priority |
|---------|-----|--------|----------|
| Email Notifications | ⭐⭐⭐ | Medium | 1 |
| Advanced Filters | ⭐⭐⭐ | Medium | 2 |
| Job Recommendations | ⭐⭐⭐ | High | 3 |
| Employer Analytics | ⭐⭐⭐ | High | 4 |
| Candidate Ranking | ⭐⭐⭐ | High | 5 |
| Company Pages | ⭐⭐ | High | 6 |
| Job Expiration | ⭐⭐ | Medium | 7 |
| Salary Insights | ⭐⭐ | Medium | 8 |
| Referral Program | ⭐⭐ | Medium | 9 |
| Interview Scheduling | ⭐ | Very High | 10 |
| Background Checks | ⭐ | High | 11 |
| Skills Endorsement | ⭐ | Medium | 12 |
| Bulk Job Posting | ⭐⭐ | High | 13 |

---

## Database Schema Changes Summary

### New Tables
- `email_notifications`
- `user_notification_preferences`
- `advanced_job_filters`
- `job_recommendations`
- `job_analytics`
- `application_ratings`
- `company_profiles`
- `company_reviews`
- `salary_benchmarks`
- `referrals`
- `referral_rewards`
- `interview_slots`
- `interviews_scheduled`
- `background_checks`
- `skill_endorsements`

### Modified Tables
- `jobs`: Add `salary_min`, `salary_max`, `job_type`, `benefits`, `expires_at`, `renewal_count`, `last_renewed_at`, `salary_currency`
- `applications`: Add `score`, `interview_status`, `interview_notes`
- `users`: Add `skills` JSON field (if not exists)

---

## Revenue Opportunities

1. **Premium Analytics** - Employers pay for advanced analytics ($10-50/month)
2. **Featured/Promoted Jobs** - Already implemented
3. **Candidate Ratings** - Employers pay for detailed candidate insights
4. **Referral Bonuses** - Platform takes % commission (e.g., 10% of hire bonus)
5. **Background Checks** - Platform earns from BG check partner fees

---

## Getting Started

**Next Step**: Start Phase 1 implementation
1. ✅ Create migration for new tables
2. ✅ Build API endpoints
3. ✅ Create frontend UI
4. ✅ Test end-to-end

Ready to begin? Start with Email Notifications System.
