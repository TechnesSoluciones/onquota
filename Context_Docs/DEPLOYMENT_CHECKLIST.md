# JWT to httpOnly Cookies Migration - Deployment Checklist

## Pre-Deployment Validation (30 minutes)

### Code Review
- [ ] All changes reviewed and approved
- [ ] No unintended modifications in diff
- [ ] All imports are correct
- [ ] No syntax errors

### Security Tests
```bash
# Backend security tests
pytest /Users/josegomez/Documents/Code/OnQuota/backend/tests/test_auth_security.py -v
```
- [ ] All tests pass
- [ ] Cookie security flags verified
- [ ] No tokens in response body
- [ ] CORS credentials allowed

### Frontend Security Tests
```bash
# Frontend security tests
npm run test -- /Users/josegomez/Documents/Code/OnQuota/frontend/__tests__/security/xss-protection.test.ts -v
```
- [ ] All tests pass
- [ ] No tokens in localStorage
- [ ] Deprecated functions return null
- [ ] XSS immunity verified

---

## Backend Deployment (30 minutes)

### File Updates
- [ ] `/Users/josegomez/Documents/Code/OnQuota/backend/modules/auth/router.py` modified
  - Register endpoint returns UserResponse
  - Login endpoint returns UserResponse
  - Refresh endpoint returns UserResponse
  - Logout endpoint deletes cookies
  - All endpoints set httpOnly cookies

- [ ] `/Users/josegomez/Documents/Code/OnQuota/backend/api/dependencies.py` modified
  - get_token_from_request() function added
  - Token extraction supports cookies (primary) and headers (fallback)
  - get_current_user() uses new token extraction

- [ ] `/Users/josegomez/Documents/Code/OnQuota/backend/main.py` modified
  - CORS allow_credentials set to True
  - Comments explain httpOnly cookie requirement

### Backend Testing
- [ ] Syntax check: `python -m py_compile backend/modules/auth/router.py`
- [ ] Syntax check: `python -m py_compile backend/api/dependencies.py`
- [ ] Syntax check: `python -m py_compile backend/main.py`
- [ ] Backend starts without errors
- [ ] Health endpoint responds: `curl http://localhost:8000/health`

### Backend Runtime Verification
```bash
# Login and verify no tokens in response
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}' \
  -v
```
- [ ] Response status: 200 OK (if user exists) or 401 (if not)
- [ ] Response body contains NO "access_token" field
- [ ] Response body contains NO "refresh_token" field
- [ ] Response headers contain Set-Cookie with HttpOnly flag
- [ ] Set-Cookie headers contain: HttpOnly, Secure (prod), SameSite=Lax

---

## Frontend Deployment (1 hour)

### File Updates
- [ ] `/Users/josegomez/Documents/Code/OnQuota/frontend/lib/api/client.ts` modified
  - apiClient created with withCredentials: true
  - Request interceptor updated (no Authorization header injection)
  - Response interceptor handles token refresh from cookies
  - Token storage functions deprecated (return null/noop)
  - Only tenant ID stored in localStorage

- [ ] `/Users/josegomez/Documents/Code/OnQuota/frontend/store/authStore.ts` modified
  - Remove persist middleware
  - setAuth() only stores tenant ID, not tokens
  - clearAuth() only clears in-memory state
  - No localStorage operations for tokens

### Frontend Testing
```bash
# TypeScript compilation
npm run build
```
- [ ] Build succeeds with no errors
- [ ] Build succeeds with no critical warnings
- [ ] Type checking passes

```bash
# Linting
npm run lint
```
- [ ] Linting passes
- [ ] No security-related warnings

```bash
# Frontend unit tests
npm run test -- security/
```
- [ ] All security tests pass
- [ ] No tokens found in test results

### Frontend Runtime Verification
```bash
# Start dev server
npm run dev
```
- [ ] Frontend loads without errors
- [ ] No console errors in DevTools
- [ ] No console warnings related to token storage

---

## Integration Testing (1-2 hours)

### Login Flow Test
1. Open application: `http://localhost:3000`
2. Navigate to login page
3. Enter valid credentials
4. Submit login form
5. [ ] Redirected to dashboard
6. [ ] No errors in console
7. Check browser cookies (DevTools → Application → Cookies):
   - [ ] `access_token` cookie exists
   - [ ] `access_token` has HttpOnly flag
   - [ ] `access_token` has Secure flag (if HTTPS)
   - [ ] `access_token` has SameSite=Lax flag
   - [ ] `refresh_token` cookie exists
   - [ ] `refresh_token` has HttpOnly flag
8. Check DevTools Console:
   - [ ] Run: `localStorage.getItem('access_token')`
   - [ ] Result: `null`
   - [ ] Run: `localStorage.getItem('refresh_token')`
   - [ ] Result: `null`
   - [ ] Run: `getAuthToken()`
   - [ ] Result: `null` with deprecation warning

### Session Persistence Test
1. Log in (from previous test)
2. [ ] Verified logged in on dashboard
3. Refresh page (F5 or Cmd+R)
4. [ ] Still on dashboard (not redirected to login)
5. [ ] User info still displayed
6. [ ] No re-authentication needed

### Protected Route Test
1. Log in (from previous test)
2. Navigate to any protected route (e.g., `/dashboard`)
3. [ ] Page loads successfully
4. [ ] All data displays correctly
5. Try making API call (use DevTools Network tab):
6. [ ] Cookie header included in request
7. [ ] No Authorization header needed
8. [ ] Response successful (200 status)

### Token Refresh Test
1. Set short token expiry for testing (optional):
   - Edit `backend/core/config.py`
   - Set `ACCESS_TOKEN_EXPIRE_MINUTES = 1`
   - Restart backend
2. Log in
3. Wait for access token to expire
4. Make API request to protected endpoint
5. [ ] Request returns 401 (token expired)
6. [ ] Response interceptor triggers refresh
7. [ ] New tokens set as cookies
8. [ ] Original request retried and succeeds
9. [ ] No manual user intervention needed

### Logout Test
1. Log in (from previous test)
2. [ ] Verified logged in with cookies
3. Click logout button
4. [ ] Redirected to login page
5. Check browser cookies:
   - [ ] `access_token` cookie deleted (Max-Age=0 in response)
   - [ ] `refresh_token` cookie deleted (Max-Age=0 in response)
6. Try accessing protected route:
   - [ ] Redirected to login
7. Check localStorage:
   - [ ] `access_token` not present
   - [ ] `refresh_token` not present
   - [ ] `tenant_id` may still be present (non-sensitive)

### XSS Prevention Verification
1. Open DevTools Console (F12)
2. Try to access auth tokens:
   ```javascript
   // These should all return null or undefined
   localStorage.getItem('access_token')        // → null
   localStorage.getItem('refresh_token')       // → null
   sessionStorage.getItem('access_token')      // → null
   document.cookie                             // Should NOT contain access_token
   ```
3. Try deprecated functions:
   ```javascript
   // These should return null with warnings
   getAuthToken()                              // → null
   getRefreshToken()                           // → null
   ```
4. [ ] All above return expected values
5. [ ] JavaScript cannot access tokens
6. [ ] XSS payload injection would fail to steal tokens

### CORS Validation
1. Test cross-origin request:
   ```bash
   curl -X OPTIONS http://localhost:8000/api/v1/auth/login \
     -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```
2. [ ] Response includes: `Access-Control-Allow-Credentials: true`
3. [ ] Response includes: `Access-Control-Allow-Origin: http://localhost:3000`
4. [ ] Response includes correct methods and headers

---

## Post-Deployment Validation (30 minutes)

### Error Log Review
- [ ] No authentication errors in logs
- [ ] No token validation errors
- [ ] No CORS errors
- [ ] No cookie-related errors

### User Experience Check
- [ ] Users can log in normally
- [ ] Users can access protected pages
- [ ] Users can navigate without re-authentication
- [ ] Users can logout successfully
- [ ] No user complaints about authentication

### Performance Check
- [ ] Login response time: < 100ms
- [ ] API request latency: < 50ms (same as before)
- [ ] Page load time: unchanged
- [ ] No slowdown from cookie management

### Security Check
- [ ] Run backend security tests again
  ```bash
  pytest backend/tests/test_auth_security.py -v
  ```
- [ ] All tests pass
- [ ] Run frontend security tests again
  ```bash
  npm run test -- security/xss-protection.test.ts
  ```
- [ ] All tests pass

---

## Known Issues & Resolutions

### Issue: "Cookies not sent with requests"
**Symptoms:** 401 Unauthorized on protected endpoints
**Resolution:**
- [ ] Verify `withCredentials: true` in axios config
- [ ] Verify CORS `allow_credentials=True` on backend
- [ ] Check Network tab for Cookie header
- [ ] Clear cookies and re-login

### Issue: "Token refresh fails"
**Symptoms:** User logged out after 15 minutes
**Resolution:**
- [ ] Verify refresh_token cookie exists
- [ ] Check refresh endpoint logs for errors
- [ ] Verify token_refresh database table has valid tokens
- [ ] Check token expiry times in settings

### Issue: "httpOnly cookies not visible in DevTools"
**Symptoms:** Can see cookies in Response but not in Application tab
**Cause:** httpOnly cookies are intentionally hidden from JavaScript inspection
**Resolution:**
- [ ] This is normal and expected
- [ ] Check Response headers for Set-Cookie with HttpOnly flag
- [ ] Verify cookie works by making authenticated requests

### Issue: "localStorage still has token-like keys"
**Symptoms:** See `access_token` or `refresh_token` in localStorage
**Resolution:**
- [ ] This should not happen with new implementation
- [ ] Check if old code is still running
- [ ] Clear browser storage completely
- [ ] Re-deploy frontend with new code
- [ ] Verify new client.ts file is being used

---

## Rollback Plan (Quick Recovery)

If critical issues occur after deployment:

### Immediate Actions (< 5 minutes)
1. [ ] Identify the issue
2. [ ] Check error logs and user reports
3. [ ] Determine if rollback is needed

### Rollback Backend (5 minutes)
```bash
# Option 1: Git rollback (if using version control)
cd /Users/josegomez/Documents/Code/OnQuota/backend
git revert <commit-hash>
systemctl restart onquota-api

# Option 2: Manual rollback (if not using git)
# Restore previous versions of:
# - /backend/modules/auth/router.py
# - /backend/api/dependencies.py
# - /backend/main.py
# Then restart: systemctl restart onquota-api
```

### Rollback Frontend (10 minutes)
```bash
# Option 1: Git rollback
cd /Users/josegomez/Documents/Code/OnQuota/frontend
git revert <commit-hash>
npm run build
systemctl restart onquota-frontend

# Option 2: Manual rollback
# Restore previous versions of:
# - /frontend/lib/api/client.ts
# - /frontend/store/authStore.ts
# Then rebuild and restart
```

### Clear User Sessions
If users are affected, they may need to clear cookies:
```javascript
// Run in browser console (for affected users)
document.cookie = "access_token=; Max-Age=0; path=/;"
document.cookie = "refresh_token=; Max-Age=0; path=/;"
localStorage.clear()
// Then refresh page and login again
```

---

## Success Criteria

Migration is successful when:

- [ ] All security tests pass
- [ ] All integration tests pass
- [ ] No authentication errors in logs
- [ ] Users can login/logout normally
- [ ] Users stay logged in after refresh
- [ ] Token refresh works automatically
- [ ] No JWT tokens in localStorage
- [ ] No JWT tokens in document.cookie
- [ ] httpOnly flag set on cookies
- [ ] SameSite=Lax flag set on cookies
- [ ] No user complaints about authentication
- [ ] Performance is unchanged or improved

---

## Post-Deployment Monitoring (First 24 hours)

### Hourly Checks (First 4 hours)
- [ ] Check error logs every 30 minutes
- [ ] Verify user login success rate > 95%
- [ ] Monitor for token refresh failures
- [ ] Watch for CORS-related errors

### Daily Checks (First week)
- [ ] Review authentication error logs daily
- [ ] Check user feedback for issues
- [ ] Monitor token refresh metrics
- [ ] Verify logout success rate

### Weekly Checks (First month)
- [ ] Review security metrics
- [ ] Check for any XSS attack attempts
- [ ] Verify no token leakage in logs
- [ ] Plan for deprecating old token functions

---

## Communication

### Team Notification
- [ ] Notify development team of deployment
- [ ] Share this checklist with team
- [ ] Schedule post-deployment meeting

### User Notification (Optional)
- [ ] Inform users of security improvement
- [ ] Ask them to logout and login (optional)
- [ ] Provide FAQ if needed
- [ ] Monitor feedback

---

## Documentation

### Update Documentation
- [ ] Update API documentation
- [ ] Update authentication flow diagrams
- [ ] Update security guidelines
- [ ] Document cookie configuration

### Archive
- [ ] Save this checklist with date of deployment
- [ ] Save deployment logs
- [ ] Save any issues and resolutions
- [ ] Archive for future reference

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Verified By:** _______________

**Status:** _______________
- [ ] Successful (all checks passed)
- [ ] Partial (some issues found, documented)
- [ ] Rolled Back (critical issues)

**Notes:**
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________

---

**Keep this document for reference and future deployments!**
