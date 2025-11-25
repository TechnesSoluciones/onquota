# Logging Examples

Real-world examples of structured JSON logs from OnQuota API.

## Request Flow Example

### 1. Unauthenticated Request to Health Endpoint

**Request Started:**
```json
{
  "event": "request_started",
  "timestamp": "2025-11-11T14:30:45.123456Z",
  "level": "info",
  "logger": "core.logging_middleware",
  "module": "core.logging_middleware",
  "func_name": "dispatch",
  "lineno": 145,
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "path": "/health",
  "query_params": {},
  "client_ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  "content_type": null,
  "content_length": null
}
```

**Request Completed:**
```json
{
  "event": "request_completed",
  "timestamp": "2025-11-11T14:30:45.145678Z",
  "level": "info",
  "logger": "core.logging_middleware",
  "module": "core.logging_middleware",
  "func_name": "dispatch",
  "lineno": 187,
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "path": "/health",
  "status_code": 200,
  "duration_ms": 22.14,
  "response_size_bytes": "87"
}
```

---

## 2. Authenticated Request to Create Expense

**Request Started:**
```json
{
  "event": "request_started",
  "timestamp": "2025-11-11T14:31:15.234567Z",
  "level": "info",
  "logger": "core.logging_middleware",
  "request_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "method": "POST",
  "path": "/api/v1/expenses",
  "query_params": {},
  "client_ip": "203.0.113.42",
  "user_agent": "PostmanRuntime/7.32.3",
  "content_type": "application/json",
  "content_length": "256",
  "user_id": "123e4567-e89b-12d3-a456-426614174001",
  "tenant_id": "987e6543-e89b-12d3-a456-426614174999"
}
```

**Application Log (from business logic):**
```json
{
  "event": "expense_created",
  "timestamp": "2025-11-11T14:31:15.378901Z",
  "level": "info",
  "logger": "modules.expenses.repository",
  "expense_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "amount": 1500.50,
  "currency": "USD",
  "category": "Travel",
  "description": "Client meeting - New York",
  "user_id": "123e4567-e89b-12d3-a456-426614174001",
  "tenant_id": "987e6543-e89b-12d3-a456-426614174999"
}
```

**Request Completed:**
```json
{
  "event": "request_completed",
  "timestamp": "2025-11-11T14:31:15.456789Z",
  "level": "info",
  "logger": "core.logging_middleware",
  "request_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "method": "POST",
  "path": "/api/v1/expenses",
  "status_code": 201,
  "duration_ms": 222.22,
  "response_size_bytes": "384",
  "user_id": "123e4567-e89b-12d3-a456-426614174001",
  "tenant_id": "987e6543-e89b-12d3-a456-426614174999"
}
```

---

## 3. Failed Request - Validation Error (400)

**Request Started:**
```json
{
  "event": "request_started",
  "timestamp": "2025-11-11T14:32:00.111111Z",
  "level": "info",
  "logger": "core.logging_middleware",
  "request_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "method": "POST",
  "path": "/api/v1/expenses",
  "query_params": {},
  "client_ip": "198.51.100.23",
  "user_agent": "curl/7.68.0",
  "content_type": "application/json",
  "user_id": "123e4567-e89b-12d3-a456-426614174001",
  "tenant_id": "987e6543-e89b-12d3-a456-426614174999"
}
```

**Request Completed (WARNING level for 4xx):**
```json
{
  "event": "request_completed",
  "timestamp": "2025-11-11T14:32:00.123456Z",
  "level": "warning",
  "logger": "core.logging_middleware",
  "request_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "method": "POST",
  "path": "/api/v1/expenses",
  "status_code": 400,
  "duration_ms": 12.34,
  "response_size_bytes": "156",
  "user_id": "123e4567-e89b-12d3-a456-426614174001",
  "tenant_id": "987e6543-e89b-12d3-a456-426614174999"
}
```

---

## 4. Failed Request - Unauthorized (401)

**Request Started:**
```json
{
  "event": "request_started",
  "timestamp": "2025-11-11T14:33:00.000001Z",
  "level": "info",
  "logger": "core.logging_middleware",
  "request_id": "e4b2c1a0-1234-5678-90ab-cdef12345678",
  "method": "GET",
  "path": "/api/v1/expenses",
  "query_params": {"page": "1", "limit": "20"},
  "client_ip": "192.0.2.100",
  "user_agent": "axios/1.5.0",
  "content_type": null
}
```

**Request Completed (WARNING level for 4xx):**
```json
{
  "event": "request_completed",
  "timestamp": "2025-11-11T14:33:00.005432Z",
  "level": "warning",
  "logger": "core.logging_middleware",
  "request_id": "e4b2c1a0-1234-5678-90ab-cdef12345678",
  "method": "GET",
  "path": "/api/v1/expenses",
  "status_code": 401,
  "duration_ms": 5.43,
  "response_size_bytes": "68"
}
```

---

## 5. Server Error - Exception During Processing (500)

**Request Started:**
```json
{
  "event": "request_started",
  "timestamp": "2025-11-11T14:34:00.111222Z",
  "level": "info",
  "logger": "core.logging_middleware",
  "request_id": "f5e4d3c2-b1a0-9876-5432-10fedcba9876",
  "method": "POST",
  "path": "/api/v1/quotes",
  "query_params": {},
  "client_ip": "203.0.113.88",
  "user_agent": "OnQuota-Mobile/2.1.0",
  "content_type": "application/json",
  "user_id": "456e7890-e89b-12d3-a456-426614174002",
  "tenant_id": "789e1234-e89b-12d3-a456-426614174888"
}
```

**Request Failed (ERROR level):**
```json
{
  "event": "request_failed",
  "timestamp": "2025-11-11T14:34:00.345678Z",
  "level": "error",
  "logger": "core.logging_middleware",
  "request_id": "f5e4d3c2-b1a0-9876-5432-10fedcba9876",
  "method": "POST",
  "path": "/api/v1/quotes",
  "duration_ms": 234.46,
  "error_type": "DatabaseError",
  "error_message": "Connection pool exhausted",
  "user_id": "456e7890-e89b-12d3-a456-426614174002",
  "tenant_id": "789e1234-e89b-12d3-a456-426614174888",
  "exception": "Traceback (most recent call last):\n  File \"core/logging_middleware.py\", line 168, in dispatch\n    response = await call_next(request)\n  ...\nsqlalchemy.exc.TimeoutError: Connection pool exhausted"
}
```

---

## 6. Query Parameters Captured

**Request Started:**
```json
{
  "event": "request_started",
  "timestamp": "2025-11-11T14:35:00.000000Z",
  "level": "info",
  "logger": "core.logging_middleware",
  "request_id": "a9b8c7d6-e5f4-3210-9876-543210fedcba",
  "method": "GET",
  "path": "/api/v1/expenses",
  "query_params": {
    "page": "2",
    "limit": "50",
    "status": "approved",
    "start_date": "2025-10-01",
    "end_date": "2025-10-31",
    "category_id": "travel"
  },
  "client_ip": "192.168.1.150",
  "user_agent": "Chrome/119.0.0.0",
  "user_id": "123e4567-e89b-12d3-a456-426614174001",
  "tenant_id": "987e6543-e89b-12d3-a456-426614174999"
}
```

---

## 7. Slow Request (High Duration)

**Request Completed:**
```json
{
  "event": "request_completed",
  "timestamp": "2025-11-11T14:36:05.678901Z",
  "level": "info",
  "logger": "core.logging_middleware",
  "request_id": "b1c2d3e4-f5a6-7890-1234-56789abcdef0",
  "method": "GET",
  "path": "/api/v1/dashboard/analytics",
  "status_code": 200,
  "duration_ms": 5678.90,
  "response_size_bytes": "125476",
  "user_id": "123e4567-e89b-12d3-a456-426614174001",
  "tenant_id": "987e6543-e89b-12d3-a456-426614174999"
}
```

---

## 8. Multiple Requests from Same User (Correlation)

All these logs share the same `user_id` and `tenant_id`, making it easy to track user activity:

```json
{
  "event": "request_completed",
  "timestamp": "2025-11-11T14:37:01.123456Z",
  "request_id": "req-001",
  "path": "/api/v1/clients",
  "status_code": 200,
  "duration_ms": 45.67,
  "user_id": "user-abc-123",
  "tenant_id": "tenant-xyz-789"
}

{
  "event": "request_completed",
  "timestamp": "2025-11-11T14:37:02.234567Z",
  "request_id": "req-002",
  "path": "/api/v1/quotes",
  "status_code": 201,
  "duration_ms": 123.45,
  "user_id": "user-abc-123",
  "tenant_id": "tenant-xyz-789"
}

{
  "event": "request_completed",
  "timestamp": "2025-11-11T14:37:03.345678Z",
  "request_id": "req-003",
  "path": "/api/v1/quotes/quote-123/pdf",
  "status_code": 200,
  "duration_ms": 890.12,
  "user_id": "user-abc-123",
  "tenant_id": "tenant-xyz-789"
}
```

---

## 9. Proxy Headers - Client IP Extraction

**With X-Forwarded-For:**
```json
{
  "event": "request_started",
  "timestamp": "2025-11-11T14:38:00.000000Z",
  "request_id": "proxy-req-001",
  "method": "GET",
  "path": "/api/v1/health",
  "client_ip": "203.0.113.195",
  "user_agent": "Mozilla/5.0"
}
```

The middleware extracts the real client IP from `X-Forwarded-For` header, not the proxy IP.

---

## 10. Application-Level Logging with Request Context

Business logic can add additional structured logs that correlate with request logs via timestamps and user/tenant IDs:

**Payment Processing:**
```json
{
  "event": "payment_initiated",
  "timestamp": "2025-11-11T14:39:00.111111Z",
  "level": "info",
  "logger": "modules.payments.service",
  "payment_id": "pay-12345",
  "amount": 5000.00,
  "currency": "USD",
  "payment_method": "credit_card",
  "user_id": "123e4567-e89b-12d3-a456-426614174001",
  "tenant_id": "987e6543-e89b-12d3-a456-426614174999"
}

{
  "event": "payment_gateway_request",
  "timestamp": "2025-11-11T14:39:00.222222Z",
  "level": "info",
  "logger": "modules.payments.gateway",
  "payment_id": "pay-12345",
  "gateway": "stripe",
  "request_id": "req_stripe_abc123"
}

{
  "event": "payment_completed",
  "timestamp": "2025-11-11T14:39:01.333333Z",
  "level": "info",
  "logger": "modules.payments.service",
  "payment_id": "pay-12345",
  "status": "succeeded",
  "transaction_id": "txn_stripe_xyz789",
  "duration_seconds": 1.11,
  "user_id": "123e4567-e89b-12d3-a456-426614174001",
  "tenant_id": "987e6543-e89b-12d3-a456-426614174999"
}
```

---

## Analysis Queries

### Find All Logs for a Specific Request

```bash
# Get complete request flow
cat app.log | jq 'select(.request_id == "550e8400-e29b-41d4-a716-446655440000")'
```

### Find Slow Requests (>1 second)

```bash
cat app.log | jq 'select(.duration_ms > 1000) | {
  request_id,
  path,
  duration_ms,
  status_code,
  user_id,
  tenant_id
}'
```

### Track User Activity

```bash
# All requests from a specific user
cat app.log | jq 'select(.user_id == "123e4567-e89b-12d3-a456-426614174001") | {
  timestamp,
  event,
  path,
  status_code,
  duration_ms
}'
```

### Find Errors by Tenant

```bash
cat app.log | jq 'select(
  .tenant_id == "987e6543-e89b-12d3-a456-426614174999" and
  (.level == "error" or .status_code >= 500)
) | {
  timestamp,
  request_id,
  path,
  error_type,
  error_message
}'
```

### Calculate Average Response Time by Endpoint

```bash
cat app.log | \
  jq -r 'select(.event == "request_completed") | "\(.path) \(.duration_ms)"' | \
  awk '{sum[$1]+=$2; count[$1]++} END {
    for(path in sum) printf "%s: %.2f ms\n", path, sum[path]/count[path]
  }' | \
  sort -t: -k2 -rn
```

### Find Most Active Users

```bash
cat app.log | \
  jq -r 'select(.user_id) | .user_id' | \
  sort | uniq -c | sort -rn | head -10
```

### Error Rate by Status Code

```bash
cat app.log | \
  jq -r 'select(.status_code) | .status_code' | \
  sort | uniq -c | sort -rn
```

---

## Integration with Monitoring Tools

These structured JSON logs can be easily ingested by:

- **ELK Stack**: Elasticsearch for storage, Kibana for visualization
- **CloudWatch Logs**: AWS-native log aggregation and analysis
- **Datadog**: Application performance monitoring
- **Splunk**: Enterprise log management
- **Grafana Loki**: Like Prometheus, but for logs
- **New Relic**: Full-stack observability

The JSON format ensures easy parsing and analysis across all platforms.
