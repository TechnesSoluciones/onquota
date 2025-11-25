# CSRF Protection Documentation

## Overview

CSRF (Cross-Site Request Forgery) protection is implemented using the double-submit cookie pattern to prevent malicious sites from performing unauthorized actions on behalf of authenticated users.

## How It Works

### Double-Submit Cookie Pattern

1. Client requests a CSRF token from `/api/v1/csrf-token`
2. Server generates a cryptographically secure random token
3. Server sends token in two places:
   - **httpOnly cookie**: Prevents JavaScript access (XSS mitigation)
   - **Response body**: For client to include in request headers
4. Client includes token from response body in `X-CSRF-Token` header for state-changing requests
5. Server validates that header token matches cookie token

### Why This Is Secure

- **Attacker cannot read the cookie** due to same-origin policy
- **Attacker cannot set custom headers** on cross-origin requests
- **Even if attacker sends cookie**, they cannot provide matching header
- Uses constant-time comparison to prevent timing attacks

## Client Implementation

### JavaScript/Fetch Example

```javascript
// 1. Get CSRF token on app initialization
async function initializeApp() {
    const response = await fetch('/api/v1/csrf-token', {
        credentials: 'include' // Important: include cookies
    });
    const { csrf_token } = await response.json();

    // Store token for use in subsequent requests
    localStorage.setItem('csrf_token', csrf_token);
}

// 2. Include token in state-changing requests
async function createExpense(expenseData) {
    const csrfToken = localStorage.getItem('csrf_token');

    const response = await fetch('/api/v1/expenses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify(expenseData)
    });

    return response.json();
}
```

### Axios Example

```javascript
import axios from 'axios';

// Create axios instance with CSRF token interceptor
const api = axios.create({
    baseURL: '/api/v1',
    withCredentials: true // Include cookies
});

// Request interceptor to add CSRF token
api.interceptors.request.use(config => {
    const csrfToken = localStorage.getItem('csrf_token');
    if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
});

// Initialize app with CSRF token
async function initApp() {
    const { data } = await api.get('/csrf-token');
    localStorage.setItem('csrf_token', data.csrf_token);
}

// Use API normally - token added automatically
async function createExpense(expenseData) {
    const { data } = await api.post('/expenses', expenseData);
    return data;
}
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

export function useCSRF() {
    const [csrfToken, setCSRFToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCSRFToken() {
            try {
                const response = await fetch('/api/v1/csrf-token', {
                    credentials: 'include'
                });
                const { csrf_token } = await response.json();
                setCSRFToken(csrf_token);
            } catch (error) {
                console.error('Failed to fetch CSRF token:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchCSRFToken();
    }, []);

    return { csrfToken, loading };
}

// Usage in component
function ExpenseForm() {
    const { csrfToken, loading } = useCSRF();

    const handleSubmit = async (data) => {
        if (!csrfToken) return;

        await fetch('/api/v1/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
    };

    if (loading) return <div>Loading...</div>;

    return <form onSubmit={handleSubmit}>...</form>;
}
```

## Backend Configuration

### Exempt Paths

Some endpoints are exempt from CSRF validation:

```python
exempt_paths = [
    "/health",              # Health checks
    "/health/ready",        # Readiness checks
    "/",                    # Root endpoint
    "/docs",                # API documentation
    "/redoc",               # ReDoc documentation
    "/openapi.json",        # OpenAPI schema
    "/api/v1/csrf-token",   # CSRF token endpoint itself
    "/api/v1/auth/login",   # Login (uses credentials)
    "/api/v1/auth/register" # Registration
]
```

### Adding Exempt Paths

To add webhook or public endpoints:

```python
# In main.py
app.add_middleware(
    CSRFMiddleware,
    secret_key=settings.SECRET_KEY,
    exempt_paths=[
        # ... existing paths
        "/api/v1/webhooks",  # Add webhook endpoints
        "/api/v1/public",    # Add public endpoints
    ],
)
```

### Custom Configuration

```python
app.add_middleware(
    CSRFMiddleware,
    secret_key=settings.SECRET_KEY,
    cookie_name="custom_csrf",      # Custom cookie name
    header_name="X-Custom-Token",   # Custom header name
    cookie_secure=True,              # HTTPS only (production)
    cookie_samesite="strict",        # Stricter same-site policy
    token_length=64,                 # Longer tokens (512 bits)
)
```

## Protected vs Unprotected Methods

### Protected (Require CSRF Token)
- POST
- PUT
- DELETE
- PATCH

### Unprotected (No CSRF Token Required)
- GET
- HEAD
- OPTIONS
- TRACE

## Error Handling

### Error Responses

#### Missing Header Token
```json
{
    "detail": "CSRF token missing in request header",
    "error": "csrf_token_missing",
    "hint": "Include CSRF token in X-CSRF-Token header"
}
```

#### Missing Cookie
```json
{
    "detail": "CSRF cookie missing",
    "error": "csrf_cookie_missing",
    "hint": "Request CSRF token from /api/v1/csrf-token endpoint"
}
```

#### Invalid Token
```json
{
    "detail": "CSRF token validation failed",
    "error": "csrf_token_invalid",
    "hint": "Token may have expired, request new token from /api/v1/csrf-token"
}
```

### Client Error Handling

```javascript
async function makeRequest(url, options) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'X-CSRF-Token': localStorage.getItem('csrf_token')
        },
        credentials: 'include'
    });

    // Handle CSRF errors
    if (response.status === 403) {
        const error = await response.json();

        if (error.error === 'csrf_token_invalid' ||
            error.error === 'csrf_cookie_missing') {
            // Token expired, get new one
            await refreshCSRFToken();
            // Retry request
            return makeRequest(url, options);
        }
    }

    return response;
}

async function refreshCSRFToken() {
    const response = await fetch('/api/v1/csrf-token', {
        credentials: 'include'
    });
    const { csrf_token } = await response.json();
    localStorage.setItem('csrf_token', csrf_token);
}
```

## Security Best Practices

### Token Lifetime
- CSRF tokens expire after 1 hour
- Refresh token on expiration or page load
- Don't store tokens longer than necessary

### Storage
- **DO**: Store in localStorage/sessionStorage for header inclusion
- **DO**: Let browser handle cookie automatically
- **DON'T**: Store in cookie via JavaScript (defeats httpOnly)
- **DON'T**: Log tokens or include in URLs

### HTTPS
- Always use HTTPS in production
- CSRF cookies have `secure` flag in production
- Never disable `cookie_secure` in production

### SameSite
- Cookies use `SameSite=lax` by default
- Prevents cookies from being sent in cross-site requests
- Additional layer of CSRF protection

## Testing

### Unit Tests

```python
# tests/unit/test_csrf_protection.py
def test_post_with_valid_csrf_token(client):
    # Get CSRF token
    response = client.get("/api/v1/csrf-token")
    csrf_token = response.json()["csrf_token"]

    # Make protected request
    response = client.post(
        "/api/v1/expenses",
        json={"amount": 100},
        headers={"X-CSRF-Token": csrf_token}
    )

    assert response.status_code != 403
```

### Integration Tests

Run tests:
```bash
pytest tests/unit/test_csrf_protection.py -v
pytest tests/integration/test_csrf_integration.py -v
```

## Troubleshooting

### Issue: CSRF validation failing in development

**Solution**: Check if `cookie_secure` is False for local development
```python
cookie_secure=not settings.DEBUG
```

### Issue: CORS blocking CSRF header

**Solution**: Ensure X-CSRF-Token is in allowed headers
```python
allow_headers=["X-CSRF-Token", ...]
```

### Issue: Token not persisting between requests

**Solution**: Ensure `credentials: 'include'` in fetch options
```javascript
fetch(url, {
    credentials: 'include',  // Required!
    // ...
})
```

### Issue: Login failing with CSRF error

**Solution**: Add login endpoint to exempt paths
```python
exempt_paths=["/api/v1/auth/login"]
```

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
