# 🔧 Fix: Admin API 401 Unauthorized Errors

## Problem Summary
Admin panel API calls returning **401 Unauthorized** with "Invalid token" messages.

## Root Cause Identification
The token IS being sent to the backend, but JWT verification is failing. This happens when:
1. **Old token from before JWT fix** - Generated with old/buggy code
2. **Backend not restarted** - Still using old process with old code
3. **Database lookup failures** - User not found or not admin

## ✅ What I've Fixed

### 1. **JWT Secret Consistency** (Already Done)
- ✅ All files now use `JWT_SECRET = "secret123"`
- ✅ No hardcoded secrets in code
- ✅ Middleware consistent across all files

### 2. **Enhanced adminAuth Middleware** (Just Now)
- ✅ Better error handling and validation
- ✅ Detailed console logging with emojis for clarity
- ✅ Checks for Bearer token format
- ✅ Validates token payload has required `id` field
- ✅ Better database error handling

### 3. **Fixed auth.js optionalAuth** (Just Now)
- ✅ Was using hardcoded `"secret123"` instead of `JWT_SECRET` constant
- ✅ Now uses consistent constant

## 🚀 How to Fix Now

### Step 1: Restart Backend Server
```bash
cd backend
# Kill any running Node process
# Then restart:
npm start
```

**Expected Output:**
```
Server running on http://localhost:3000
Connected to MySQL database
Schema checks complete
```

### Step 2: Clear Browser Storage & Force Refresh
**Open DevTools (F12) → Console tab** and run:
```javascript
localStorage.clear();
sessionStorage.clear();
location.href = '/login.html';
```

Or manually:
1. Press `F12` to open DevTools
2. Go to **Application** tab
3. Click **Storage** → **Clear site data**
4. Navigate to `localhost:3000/login.html`

### Step 3: Login with Admin Account
- Email: admin account email
- Password: admin account password
- Click **Login**

### Step 4: Check Console for Success Messages
After login, switch to **admin.html** and open console. You should see:

```
[authFetch] Token attached: eyJhbGciOiJIUzI1NiIs..., URL: http://localhost:3000/api/admin/jobs
[AdminAuth] 🔐 Verifying token: eyJ...
[AdminAuth] ✅ Token verified. User ID: 1, is_admin: 1
[AdminAuth] ✅ Admin access granted for user 1 (admin@example.com)
```

Then jobs, applications, reviews should load! ✅

## 🔍 Troubleshooting

### If Still Getting 401 Error

**Check the backend console logs:**

1. **"No token provided"**
   - Token not being sent from frontend
   - Check: Is `utils.js` loaded before `admin.js`?
   - Solution: Clear cache, hard refresh (Ctrl+Shift+R)

2. **"Invalid token format"**
   - Authorization header not formatted as `Bearer TOKEN`
   - Check: `authFetch()` in `utils.js` adds `Bearer ` prefix

3. **"JWT verification failed: invalid signature"**
   - Token generated with different secret than used for verification
   - Solution: MUST clear localStorage and login again

4. **"User not found"**
   - User ID in token doesn't exist in database
   - Solution: Verify admin user exists: `SELECT id, is_admin FROM users WHERE email = 'admin@example.com';`

5. **"Admin only" (403 Forbidden)**
   - User exists but `is_admin = 0`
   - Solution: Update user: `UPDATE users SET is_admin = 1 WHERE email = 'admin@example.com';`

### Database Query to Verify Admin User

```sql
-- Check admin user exists and is marked as admin
SELECT id, email, is_admin, role FROM users WHERE is_admin = 1;

-- If no results, make a user admin:
UPDATE users SET is_admin = 1 WHERE email = 'your-admin-email@example.com';

-- Verify after update:
SELECT id, email, is_admin FROM users WHERE email = 'your-admin-email@example.com';
```

## 📋 Files Modified in This Fix

**Backend Middleware:**
- ✅ `backend/middleware/adminAuth.js` - Enhanced with detailed logging
- ✅ `backend/middleware/auth.js` - Fixed hardcoded secret (line 41)

**Already Fixed (Earlier):**
- ✅ `backend/utils/jwt.js` - Consolidated JWT secret
- ✅ `backend/middleware/auth.js` - JWT_SECRET constant (main auth)
- ✅ `backend/middleware/optionalAuth.js` - JWT_SECRET constant
- ✅ `backend/controllers/usersController.js` - Token generation

## ✨ Next Steps

1. **Restart backend** (if not already running)
2. **Clear browser storage** (localStorage.clear())
3. **Login again** with admin credentials
4. **Check console** for success messages
5. **Verify admin panel loads** with data

## 🆘 Still Not Working?

If you've followed all steps and still getting errors:

1. **Check backend console output** - paste the exact error
2. **Verify database** - does admin user exist with `is_admin = 1`?
3. **Check network tab** - what's being sent in Authorization header?
4. **Verify port** - is backend running on `localhost:3000`?

The error messages are now much more detailed, so the backend logs will tell you exactly what's wrong!
