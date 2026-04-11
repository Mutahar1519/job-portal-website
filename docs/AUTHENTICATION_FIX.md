# Authentication (401 Unauthorized) Fix

## Problem
Admin panel was getting `401 Unauthorized` errors on all API calls with message "Invalid token"

## Root Causes Fixed
1. **JWT Secret Mismatch**: The unused `backend/utils/jwt.js` had secret `"SECRET_KEY_123"` while runtime code used a different JWT secret configuration.
2. **Inconsistent Token Verification**: Different middleware files sometimes used hardcoded secrets without a shared constant
3. **Lack of Debugging**: No visibility into why tokens were failing

## Changes Made

### 1. Consolidated JWT Secret (`backend/utils/jwt.js`)
- Changed from: `"SECRET_KEY_123"` (wrong, unused)
- Changed to: Export both `generateToken()` and `JWT_SECRET` constant
- Now consistently uses: `process.env.JWT_SECRET`

### 2. Updated All Middleware Files
All files now import/define `JWT_SECRET = process.env.JWT_SECRET`:
- `backend/middleware/auth.js` ✅
- `backend/middleware/adminAuth.js` ✅
- `backend/middleware/optionalAuth.js` ✅
- `backend/middleware/employerOnly.js` (if needed)

### 3. Enhanced Token Verification Logging
Added detailed console logging to track:
- **Frontend (`utils.js`)**: Logs token being sent (preview) and URL
- **Backend (`adminAuth.js`)**: Logs token verification details, including:
  - Whether token header exists
  - Token format (first 20 chars)
  - Verification errors
  - User admin status check

### 4. Token Generation in Controller
`backend/controllers/usersController.js` now explicitly uses consistent `JWT_SECRET`

## Testing Steps

### 1. Clear Browser Storage & Restart
```javascript
// In browser console:
localStorage.clear();
location.reload();
```

### 2. Login to Admin Account
- Go to login.html
- Use admin credentials (email with `is_admin=1` in database)
- Check browser console for auth logs

### 3. Monitor Console Errors
Watch for these logs:
- `[authFetch] Token attached: XXX...XXX` → Token being sent
- `[AdminAuth] Token verified for user ID: N` → Success
- `[AdminAuth] Token verification failed:` → Problem with token

### 4. Check Admin Dashboard
After login, admin.html should load jobs, applications, reviews, etc. without 401 errors.

## If Still Experiencing Issues

### Check these things:
1. **Is user in database as admin?**
   ```sql
   SELECT id, email, is_admin FROM users WHERE email = 'admin@example.com';
   -- Should show: is_admin = 1
   ```

2. **Is token being sent?** 
   - Check Network tab → Request Headers
   - Should show: `Authorization: Bearer eyJhbGc...`

3. **Is token format correct?**
   - Tokens should start with `eyJ` (base64 encoded JWT header)
   - Check console log: `[authFetch] Token attached:`

4. **Backend Service Running?**
   - Start backend: `npm start` in `backend/` folder
   - Check `server.js` is listening on correct port (usually 3000)
   - Check database connection in `backend/config/db.js`

5. **Clear Cache & Restart**
   ```bash
   # Restart backend
   # Clear browser cache (Ctrl+Shift+Delete)
   # Navigate to login.html fresh
   ```

## Environment Setup Reminder
For production, move secrets to environment variables:
```bash
# .env file in backend/
JWT_SECRET=your-secret-key-here
STRIPE_SECRET_KEY=sk_...
DATABASE_URL=mysql://...
```

Then update code:
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
```

## Files Modified
- ✅ `backend/utils/jwt.js` - Fixed secret and exports
- ✅ `backend/middleware/auth.js` - Added logging, consistent secret
- ✅ `backend/middleware/adminAuth.js` - Enhanced logging
- ✅ `backend/middleware/optionalAuth.js` - Consistent secret
- ✅ `backend/controllers/usersController.js` - Explicit JWT_SECRET
- ✅ `frontend/js/utils.js` - Enhanced debug logging
