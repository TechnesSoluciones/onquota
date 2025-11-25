# Rate Limiting Implementation

## Overview
Comprehensive rate limiting has been implemented to protect against DoS attacks and brute force attempts using SlowAPI (FastAPI rate limiting library).

## Implementation Details

### 1. Dependencies Added
- **slowapi v0.1.9** - FastAPI rate limiting library with Redis backend support

### 2. Rate Limiter Configuration
**File:** `/Users/josegomez/Documents/Code/OnQuota/backend/core/rate_limiter.py`

#### Key Features:
- **Redis-backed storage** for distributed rate limiting across multiple workers/instances
- **Intelligent identifier function** that tracks by:
  1. User ID (for authenticated requests)
  2. IP address (for unauthenticated requests)
- **Custom exception handler** that logs rate limit violations
- **Configurable limits** for different endpoint types

#### Rate Limit Constants:
```python
AUTH_LOGIN_LIMIT = "5/minute"       # Login: 5 attempts/minute
AUTH_REGISTER_LIMIT = "3/minute"    # Register: 3 attempts/minute
AUTH_REFRESH_LIMIT = "10/minute"    # Token refresh: 10/minute
WRITE_OPERATION_LIMIT = "100/minute"  # POST/PUT/DELETE
READ_OPERATION_LIMIT = "300/minute"   # GET operations
HEALTH_CHECK_LIMIT = "1000/minute"    # Health checks
```

#### Security Features:
- **Fixed-window strategy** for rate limiting
- **Automatic Retry-After headers** in 429 responses
- **Rate limit violation logging** for security monitoring
- **X-RateLimit-* headers** added to responses for client visibility
- **IP tracking from X-Forwarded-For** for proxy/load balancer scenarios

### 3. Protected Endpoints

#### Authentication Endpoints (Strict Limits)
All authentication endpoints now have strict rate limits applied:

| Endpoint | Rate Limit | Purpose |
|----------|-----------|---------|
| `POST /api/v1/auth/login` | 5/minute | Prevent brute force password attacks |
| `POST /api/v1/auth/register` | 3/minute | Prevent registration spam |
| `POST /api/v1/auth/refresh` | 10/minute | Prevent token refresh abuse |
| `POST /api/v1/auth/logout` | 10/minute | General protection |

#### Global Default Limit
- All other endpoints: **100 requests/minute** (configurable via `RATE_LIMIT_PER_MINUTE` in config)

### 4. Integration Points

#### main.py
Rate limiting is configured during application startup:
```python
from core.rate_limiter import configure_rate_limiting

# Configure rate limiting (security: prevent DoS and brute force attacks)
configure_rate_limiting(app)
```

#### Auth Router
Each authentication endpoint decorated with appropriate limits:
```python
from core.rate_limiter import limiter, AUTH_LOGIN_LIMIT

@router.post("/login", response_model=TokenResponse)
@limiter.limit(AUTH_LOGIN_LIMIT)
async def login(request: Request, ...):
    # Note: Request parameter MUST be first for SlowAPI to work
    ...
```

## Testing Rate Limits

### Manual Testing

1. **Test Login Rate Limit:**
```bash
# Try to login 6 times quickly (limit is 5/minute)
for i in {1..6}; do
  curl -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}' \
    -w "\n%{http_code}\n"
done

# Expected: First 5 requests return 401 (unauthorized)
# 6th request returns 429 (Too Many Requests)
```

2. **Test Registration Rate Limit:**
```bash
# Try to register 4 times quickly (limit is 3/minute)
for i in {1..4}; do
  curl -X POST http://localhost:8000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test'$i'@example.com","password":"Test123!","company_name":"Test","full_name":"Test"}' \
    -w "\n%{http_code}\n"
done

# Expected: 4th request returns 429 (Too Many Requests)
```

3. **Check Response Headers:**
```bash
curl -v -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Expected headers:
# X-RateLimit-Limit: 5
# X-RateLimit-Remaining: 4
# X-RateLimit-Reset: <timestamp>
```

4. **Verify 429 Response:**
When rate limit is exceeded, response will be:
```json
{
  "error": "Rate limit exceeded: 5 per 1 minute"
}
```
With headers:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: <timestamp>
```

### Load Testing
Use Locust (already in requirements.txt) for comprehensive testing:

```python
from locust import HttpUser, task, between

class RateLimitTest(HttpUser):
    wait_time = between(0.1, 0.2)  # Fast requests to trigger limit

    @task
    def test_login_rate_limit(self):
        response = self.client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "wrongpassword"
        })

        if response.status_code == 429:
            print(f"Rate limit triggered at request")
```

Run with: `locust -f test_rate_limit.py`

## Security Benefits

### 1. Brute Force Protection
- **Login attempts limited to 5/minute** prevents password guessing
- Failed attempts are rate-limited per IP/user
- Attacker would need 2,880 minutes (48 hours) to try 14,400 passwords

### 2. DoS/DDoS Mitigation
- **Global rate limits** prevent resource exhaustion
- Redis backend allows distributed limiting across instances
- Automatic 429 responses reduce server load

### 3. Account Enumeration Protection
- **Registration rate limits** prevent email enumeration attacks
- Combined with generic error messages (from other security measures)

### 4. Token Refresh Abuse Prevention
- **Refresh endpoint limited** prevents token farming
- Reduces load on token generation and database

## Monitoring & Logging

All rate limit violations are logged with structlog:
```python
logger.warning(
    "rate_limit_exceeded",
    identifier="ip:192.168.1.1",  # or "user:123e4567-..."
    path="/api/v1/auth/login",
    method="POST",
    limit="5 per 1 minute"
)
```

### Recommended Monitoring
1. **Alert on high rate limit violations** - May indicate attack attempt
2. **Track rate limit metrics by endpoint** - Identify abuse patterns
3. **Monitor 429 response rates** - Ensure legitimate users aren't affected
4. **Review IP patterns** - Detect distributed attacks

## Configuration

Rate limits can be adjusted via environment variables in `.env`:

```bash
# Global rate limits (per minute)
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_PER_HOUR=1000

# Redis connection for rate limiting
REDIS_URL=redis://localhost:6379
```

Custom limits per endpoint can be modified in `/core/rate_limiter.py`:
```python
AUTH_LOGIN_LIMIT = "5/minute"  # Adjust as needed
```

## Dependencies

### Redis Requirement
Rate limiting requires Redis to be running:

```bash
# Start Redis with Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install locally
brew install redis  # macOS
apt install redis   # Ubuntu/Debian
```

### Verification
Ensure Redis is accessible:
```bash
redis-cli ping
# Expected: PONG
```

## Exemptions (Use Carefully)

The `exempt_from_rate_limit()` function in `rate_limiter.py` can be used to exempt certain requests:

```python
def exempt_from_rate_limit(request: Request) -> bool:
    # Example: Exempt health checks from localhost
    if request.url.path in ["/health", "/health/ready"]:
        if request.client and request.client.host == "127.0.0.1":
            return True
    return False
```

**WARNING:** Be very conservative with exemptions. Most requests should be rate limited.

## Troubleshooting

### Issue: Rate limits not working
1. Check Redis is running: `redis-cli ping`
2. Verify REDIS_URL in .env
3. Check logs for rate limiter initialization
4. Ensure Request parameter is first in endpoint function

### Issue: Too many 429 errors
1. Review rate limit thresholds (may be too strict)
2. Check if legitimate users are being blocked
3. Consider adjusting limits per endpoint
4. Verify IP tracking is working correctly (check X-Forwarded-For)

### Issue: Rate limits not distributed
1. Ensure Redis backend is configured (not in-memory)
2. Verify all instances use same Redis connection
3. Check Redis connectivity from all workers

## Best Practices

1. **Monitor rate limit violations** - Set up alerts for suspicious patterns
2. **Adjust limits based on usage** - Start strict, relax if needed
3. **Different limits for different endpoints** - Auth endpoints need stricter limits
4. **Consider user experience** - Don't make limits so strict legitimate users are affected
5. **Use Redis in production** - In-memory storage doesn't work with multiple workers
6. **Log all violations** - Essential for security monitoring and incident response
7. **Test thoroughly** - Verify limits work as expected before production

## Related Security Measures

Rate limiting works best when combined with other security measures:
- **Account lockout** after multiple failed attempts
- **CAPTCHA** for repeated failures
- **IP blacklisting** for persistent abusers
- **WAF/CDN rate limiting** at network edge
- **Honeypot endpoints** to detect scanners

## Next Steps

Consider implementing:
1. **Dynamic rate limiting** - Adjust limits based on user behavior
2. **Account-level lockouts** - Temporary disable accounts after violations
3. **Geographic rate limiting** - Different limits per region
4. **Endpoint-specific limits** - Fine-tune based on resource usage
5. **Rate limit bypass for trusted IPs** - Whitelist internal services

## Security Impact

**CRITICAL SECURITY IMPROVEMENT:**
- ✅ Prevents brute force attacks on authentication
- ✅ Mitigates DoS/DDoS attacks
- ✅ Reduces account enumeration risk
- ✅ Protects against credential stuffing
- ✅ Limits API abuse and resource exhaustion

**Status:** PRODUCTION READY
**Priority:** P0 (Critical Security)
**Testing Required:** Load testing recommended before production deployment
