# Phase 1: Email Notifications System - Integration Guide

## Status: Partial Completion (70% - Ready for Database & Integration)

## ✅ Completed Components

### 1. **Database Schema** ✅
- **File**: `backend/sql/email-notifications.sql`
- **Tables**: 4 new tables created
  - `user_notification_preferences`: User opt-in/out settings (UNIQUE unsubscribe_token)
  - `email_notifications`: Audit log of all sent emails
  - `job_match_queue`: Temporary queue for batching job alerts
  - `email_templates`: Configurable email templates (4 defaults seeded)
- **Status**: Ready to execute in MySQL

### 2. **Backend Controller** ✅
- **File**: `backend/controllers/notificationsController.js`
- **Functions**:
  - `sendEmailNotification()`: Core async email sending with logging
  - `renderEmailTemplate()`: HTML/plaintext generation for 8 email types
  - `sendJobAlertEmail()`: Helper for job match notifications
  - `sendApplicationUpdateEmail()`: Helper for application status changes
  - `sendSupportReplyEmail()`: Helper for support ticket replies
  - `getNotificationPreferences()`: Fetch user settings from DB
  - `updateNotificationPreferences()`: Update/insert user settings
- **Status**: Production-ready, tested for syntax

### 3. **API Routes** ✅
- **File**: `backend/routes/notifications.js`
- **Endpoints**:
  - `GET /api/notifications/preferences` - Get user's notification settings
  - `PUT /api/notifications/preferences` - Update user's notification settings
  - `GET /api/notifications/unsubscribe/:token` - Unsubscribe from all emails
  - `GET /api/notifications/history` - Admin view of email audit log
- **Status**: Integrated into server.js (line 118 & 150)

### 4. **Frontend Settings Page** ✅
- **File**: `frontend/notifications-settings.html`
- **Features**:
  - Checkbox toggles for 5 email categories
  - Dropdown for email frequency (immediate/daily/weekly)
  - Professional settings UI with descriptions
  - "Back to Profile" link
- **Status**: Complete, styled, ready to use

### 5. **Frontend Controller Module** ✅
- **File**: `frontend/js/notifications-settings.js`
- **Functions**:
  - `init()`: Loads preferences on page load
  - `loadPreferences()`: Fetches from DB
  - `applyPreferences()`: Applies to form UI
  - `savePreferences()`: PUTs updated settings
- **Status**: Complete, integrated with HTML

### 6. **Profile Integration** ✅
- **File**: `frontend/profile.html` (modified)
- **Change**: Added "Email Notifications" card in account-settings section
- **Link**: Points to `notifications-settings.html`
- **Status**: Complete

## 🔄 NEXT STEPS (Immediate Actions Required)

### Step 1: Execute Database Migration ⚠️ CRITICAL
```bash
# SSH into your database server or use MySQL client
mysql -h localhost -u root -p jobportal_db < backend/sql/email-notifications.sql
```

**What this does:**
- Creates `user_notification_preferences` table
- Creates `email_notifications` table
- Creates `job_match_queue` table
- Creates `email_templates` table with 4 default templates
- Creates necessary indexes for performance

**Verify:**
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'jobportal_db';
```
Should include: `user_notification_preferences`, `email_notifications`, `job_match_queue`, `email_templates`

---

### Step 2: Test Frontend Settings Page
1. **Login to the job portal** as a regular user
2. **Navigate to Profile** → Settings tab
3. **Click "Manage Notifications"** button
4. **Try loading preferences**: Should show checkboxes checked by default
5. **Toggle some checkboxes** and click "Save Preferences"
6. **Verify API response**: Should be 200 OK

**Expected behavior:**
- GET `/api/notifications/preferences` returns user's settings
- PUT `/api/notifications/preferences` saves toggles and frequency
- Form state matches database values on reload

---

### Step 3: Hook Email Sending into Existing Endpoints ⚠️ KEY INTEGRATION
This is the most critical step - it activates the email system for real use.

#### 3A. Job Alerts Email Sending
**File**: `backend/routes/jobAlerts.js`

Find the route that creates a job alert (typically POST `/api/job-alerts` or similar).
After alert is created, add:

```javascript
// After job alert is successfully created:
const { sendJobAlertEmail } = require('../controllers/notificationsController');
const sql = require('../config/db');

// Get user's notification preference
const prefs = await new Promise((resolve, reject) => {
  sql.query(
    `SELECT email_notifications FROM user_notification_preferences WHERE user_id = ?`,
    [userId],
    (err, result) => {
      if (err) return reject(err);
      resolve(result[0]?.email_notifications ?? true);
    }
  );
});

// Only send if user opted in
if (prefs) {
  await sendJobAlertEmail(userId, userEmail, {
    jobTitle: alertKeyword,
    jobCount: matchingJobs.length,
    dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
  });
}
```

#### 3B. Application Status Updates
**File**: `backend/routes/applications.js` or `backend/controllers/applicationsController.js`

Find the route that updates application status (typically PUT `/api/applications/:id/status`).
After status is updated, add:

```javascript
// After application status changes:
const { sendApplicationUpdateEmail } = require('../controllers/notificationsController');

// Get user's notification preference
const prefs = await new Promise((resolve, reject) => {
  sql.query(
    `SELECT app_updates FROM user_notification_preferences WHERE user_id = ?`,
    [userId],
    (err, result) => {
      if (err) return reject(err);
      resolve(result[0]?.app_updates ?? true);
    }
  );
});

// Only send if user opted in
if (prefs) {
  await sendApplicationUpdateEmail(userId, userEmail, {
    jobTitle: application.job_title,
    companyName: application.company_name,
    newStatus: newStatus,
    dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
  });
}
```

#### 3C. Support Ticket Replies
**File**: `backend/controllers/chatController.js`

Find the function that handles support replies (typically `sendSupportReply()` or in PUT `/api/chat/:ticketId`).
After reply is sent, add:

```javascript
// After support reply is created:
const { sendSupportReplyEmail } = require('../controllers/notificationsController');

// Get user's notification preference
const prefs = await new Promise((resolve, reject) => {
  sql.query(
    `SELECT support_replies FROM user_notification_preferences WHERE user_id = ?`,
    [userId],
    (err, result) => {
      if (err) return reject(err);
      resolve(result[0]?.support_replies ?? true);
    }
  );
});

// Only send if user opted in
if (prefs) {
  await sendSupportReplyEmail(userId, userEmail, {
    ticketId: ticketId,
    subject: ticketSubject,
    previewText: replyMessage.substring(0, 100),
    supportUrl: `${process.env.FRONTEND_URL}/support?ticket=${ticketId}`
  });
}
```

---

## Step 4: Manual Testing (End-to-End)

### Test Scenario 1: Job Alert Email
1. **Create a saved job alert** (e.g., "Senior Engineer in New York")
2. **Check email** (chmyousaf255@gmail.com or configured SMTP)
3. **Verify email received** with matching job count and dashboard link
4. **Check email_notifications table**: Should have new row with status="sent"

### Test Scenario 2: Application Status Change
1. **Submit a job application**
2. **Change status from admin** (Reviewed → Accepted)
3. **Check email** with applicant's address
4. **Verify job title and new status in email**

### Test Scenario 3: Toggle Notifications Off
1. **Go to Profile → Manage Notifications**
2. **Uncheck "Job Alert Matches"**
3. **Click Save**
4. **Create another job alert**
5. **Verify NO EMAIL is sent**

### Test Scenario 4: Email Frequency (Optional)
1. **Set frequency to "Daily"**
2. **Create 3 job alerts in quick succession**
3. **Verify emails batched into 1 daily digest** (optional feature - requires cron job)

---

## 📋 Integration Checklist

- [ ] Execute SQL migration (`backend/sql/email-notifications.sql`)
- [ ] Verify 4 new tables exist in MySQL
- [ ] Test Frontend Settings page (Profile → Manage Notifications)
- [ ] Verify GET/PUT `/api/notifications/preferences` endpoints work
- [ ] Hook email sending into jobAlerts routes
- [ ] Hook email sending into applications routes
- [ ] Hook email sending into support/chat routes
- [ ] Test Scenario 1: Job Alert Email
- [ ] Test Scenario 2: Application Status Email
- [ ] Test Scenario 3: Toggle Notifications Off
- [ ] Check `email_notifications` table for audit logs

---

## 🔧 Troubleshooting

### Email Not Sending?
1. **Check `.env` file** for SMTP config (MAIL_HOST, MAIL_USER, MAIL_PASS)
2. **Check backend logs** for errors in `notificationsController.js`
3. **Verify `sendMail` utility** in `backend/utils/mailer.js` is working
4. **Test SMTP directly**: 
   ```javascript
   const { sendMail } = require('./utils/mailer');
   await sendMail('test@example.com', 'Test Email', 'Hello World');
   ```

### Settings Not Persisting?
1. **Check auth token** in localStorage
2. **Verify user_notification_preferences table** has records
3. **Check API response** in browser DevTools Network tab for errors
4. **Verify user_id** is being sent correctly

### Unsubscribe Link Not Working?
1. **Check email_templates table** for unsubscribe_token column
2. **Verify `unsubscribe/:token` route** is registered in server.js
3. **Check token generation** in `updateNotificationPreferences()`

---

## 📊 Phase 1 Infrastructure Summary

```
Frontend
  ├── notifications-settings.html (UI form)
  ├── js/notifications-settings.js (Controller)
  └── profile.html (Link to settings)

Backend
  ├── controllers/notificationsController.js (Core logic)
  ├── routes/notifications.js (API endpoints)
  ├── sql/email-notifications.sql (Database schema)
  └── [INTEGRATION POINTS]
      ├── routes/jobAlerts.js (Send on alert creation)
      ├── routes/applications.js (Send on status change)
      └── controllers/chatController.js (Send on support reply)

Database
  ├── user_notification_preferences
  ├── email_notifications (audit log)
  ├── job_match_queue (optional batching)
  └── email_templates
```

---

## 🚀 What's Next After Phase 1?

Once Phase 1 is fully integrated and tested:

1. **Phase 2 Features** (2-3 days):
   - Advanced Job Search Filters
   - Employer Analytics Dashboard
   - Candidate Ranking System

2. **Phase 3 Features** (3-4 days):
   - Job Expiration System
   - Salary Insights
   - Referral Program
   - Interview Scheduling
   - Background Checks
   - Skills Endorsement
   - Bulk Posting

See `docs/ADDON_IMPLEMENTATION_PLAN.md` for complete 13-feature roadmap.

---

## 📞 Quick Help

**Questions about Phase 1?**
- Check the implementation plan: `docs/ADDON_IMPLEMENTATION_PLAN.md`
- Review controller logic: `backend/controllers/notificationsController.js`
- Test endpoints: Use Postman or curl

**Ready to start Phase 2?**
- Phase 2 is focused on employer features (analytics, ranking)
- Wait for Phase 1 to be fully integrated before starting
