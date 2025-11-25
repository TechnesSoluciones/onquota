# Structured Request Logging

This document describes the structured logging system implemented in OnQuota for production debugging and monitoring.

## Overview

The application uses `structlog` for structured logging with JSON output, making logs easily parseable by log aggregation systems like ELK Stack, Datadog, CloudWatch, etc.

## Features

- **Structured JSON Logs**: All logs are formatted as JSON for easy parsing and analysis
- **Request Tracking**: Every request gets a unique `request_id` for correlation
- **User Context**: Authenticated requests include `user_id` and `tenant_id`
- **Performance Monitoring**: Request duration (latency) tracked in milliseconds
- **Security**: Sensitive headers (Authorization, Cookie, API keys) are automatically redacted
- **Client Information**: IP address and user agent captured for debugging
- **Error Tracking**: Exceptions logged with full stack traces and context

## Configuration

### Environment Variables

Configure logging behavior via `.env` file:

```bash
# Logging configuration
LOG_LEVEL=INFO          # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_FORMAT=json         # json (production) or console (development)
```

### Log Levels

- **DEBUG**: Detailed information for diagnosing problems
- **INFO**: General informational messages (default)
- **WARNING**: Warning messages (e.g., 4xx responses)
- **ERROR**: Error messages (e.g., 5xx responses, exceptions)
- **CRITICAL**: Critical errors requiring immediate attention

## Request Logging

### What Gets Logged

#### Request Start (`request_started`)

```json
{
  "event": "request_started",
  "timestamp": "2025-11-11T10:30:45.123456Z",
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "method": "POST",
  "path": "/api/v1/expenses",
  "query_params": {"page": "1", "limit": "20"},
  "client_ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "content_type": "application/json",
  "user_id": "456e7890-e89b-12d3-a456-426614174001",
  "tenant_id": "789e1234-e89b-12d3-a456-426614174002",
  "module": "core.logging_middleware",
  "func_name": "dispatch",
  "lineno": 123
}
```

#### Request Completion (`request_completed`)

```json
{
  "event": "request_completed",
  "timestamp": "2025-11-11T10:30:45.456789Z",
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "method": "POST",
  "path": "/api/v1/expenses",
  "status_code": 201,
  "duration_ms": 145.67,
  "response_size_bytes": "1024",
  "user_id": "456e7890-e89b-12d3-a456-426614174001",
  "tenant_id": "789e1234-e89b-12d3-a456-426614174002",
  "module": "core.logging_middleware",
  "func_name": "dispatch",
  "lineno": 234
}
```

#### Request Failure (`request_failed`)

```json
{
  "event": "request_failed",
  "timestamp": "2025-11-11T10:30:45.789012Z",
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "method": "POST",
  "path": "/api/v1/expenses",
  "duration_ms": 89.23,
  "error_type": "ValidationError",
  "error_message": "Invalid expense amount",
  "user_id": "456e7890-e89b-12d3-a456-426614174001",
  "tenant_id": "789e1234-e89b-12d3-a456-426614174002",
  "exception": "Traceback (most recent call last)...",
  "module": "core.logging_middleware",
  "func_name": "dispatch",
  "lineno": 345
}
```

### Request ID Header

Every response includes an `X-Request-ID` header that clients can use for debugging:

```bash
curl -I https://api.onquota.com/health
HTTP/1.1 200 OK
X-Request-ID: 123e4567-e89b-12d3-a456-426614174000
```

This allows users to report issues with the specific request ID for debugging.

## Usage in Code

### Getting a Logger

```python
from core.logging_config import get_logger

logger = get_logger(__name__)
```

### Logging with Context

```python
# Info level with structured data
logger.info(
    "Expense created",
    expense_id=expense.id,
    amount=expense.amount,
    category=expense.category.name,
    user_id=current_user.id,
    tenant_id=current_user.tenant_id
)

# Warning level
logger.warning(
    "Expense amount exceeds budget",
    expense_id=expense.id,
    amount=expense.amount,
    budget_limit=category.budget_limit,
    tenant_id=current_user.tenant_id
)

# Error level with exception
try:
    process_expense(expense)
except Exception as e:
    logger.error(
        "Failed to process expense",
        expense_id=expense.id,
        error=str(e),
        exc_info=True  # Include full stack trace
    )
    raise
```

### Binding Context

You can bind context that will be included in all subsequent log entries:

```python
from core.logging_config import bind_context, unbind_context, clear_context

# Bind context for all logs in this scope
bind_context(tenant_id=tenant.id, operation="bulk_import")

logger.info("Starting bulk import", count=100)
# ... more operations ...
logger.info("Bulk import completed", processed=100, failed=5)

# Clean up context
unbind_context("tenant_id", "operation")
# Or clear all context
clear_context()
```

## Excluded Paths

The following paths are excluded from request logging to reduce noise:

- `/health` - Health check endpoint
- `/health/ready` - Readiness check endpoint
- `/metrics` - Metrics endpoint (if implemented)

These paths still receive the `X-Request-ID` header but are not logged.

To customize excluded paths:

```python
# In main.py
app.add_middleware(
    RequestLoggingMiddleware,
    excluded_paths=["/health", "/metrics", "/custom-excluded-path"]
)
```

## Log Analysis

### Find All Requests for a User

```bash
# Using jq to filter JSON logs
cat app.log | jq 'select(.user_id == "456e7890-e89b-12d3-a456-426614174001")'
```

### Find Slow Requests (>1 second)

```bash
cat app.log | jq 'select(.duration_ms > 1000) | {request_id, path, duration_ms, status_code}'
```

### Track a Specific Request

```bash
# Get all log entries for a specific request_id
cat app.log | jq 'select(.request_id == "123e4567-e89b-12d3-a456-426614174000")'
```

### Find All Errors for a Tenant

```bash
cat app.log | jq 'select(.tenant_id == "789e1234-e89b-12d3-a456-426614174002" and .level == "error")'
```

### Calculate Average Response Time by Endpoint

```bash
cat app.log | jq -r 'select(.event == "request_completed") | "\(.path) \(.duration_ms)"' | \
  awk '{sum[$1]+=$2; count[$1]++} END {for(path in sum) print path, sum[path]/count[path]}'
```

## Integration with Log Aggregation Systems

### ELK Stack (Elasticsearch, Logstash, Kibana)

Configure Filebeat to ship logs:

```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/onquota/app.log
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

### CloudWatch Logs

Use AWS CloudWatch agent with JSON parsing:

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/onquota/app.log",
            "log_group_name": "/aws/onquota/app",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S.%fZ"
          }
        ]
      }
    }
  }
}
```

### Datadog

Configure Datadog agent for JSON logs:

```yaml
# datadog.yaml
logs:
  - type: file
    path: /var/log/onquota/app.log
    service: onquota-api
    source: python
    sourcecategory: sourcecode
```

## Security Considerations

### Sensitive Data Redaction

The logging middleware automatically redacts sensitive headers:

- `Authorization`
- `Cookie`
- `X-API-Key`
- `X-Auth-Token`
- `Proxy-Authorization`

These appear as `***REDACTED***` in logs.

### PII (Personally Identifiable Information)

Be careful not to log PII in application code:

**Don't do this:**
```python
logger.info("User registered", email=user.email, ssn=user.ssn)  # BAD!
```

**Do this instead:**
```python
logger.info("User registered", user_id=user.id, tenant_id=user.tenant_id)  # GOOD!
```

### Request/Response Body Logging

By default, request and response bodies are NOT logged to prevent PII exposure.

If you need to enable it for debugging (development only):

```python
app.add_middleware(
    RequestLoggingMiddleware,
    log_request_body=True,  # Enable with caution
    log_response_body=True   # Enable with caution
)
```

## Performance Impact

The logging middleware has minimal performance impact:

- Average overhead: **<5ms per request**
- No blocking I/O operations
- Async-friendly implementation
- Excluded paths have near-zero overhead

## Testing

### Run Unit Tests

```bash
pytest tests/unit/test_logging_middleware.py -v
```

### Run Integration Tests

```bash
pytest tests/integration/test_logging_integration.py -v
```

### Manual Testing

```bash
# Start the server
uvicorn main:app --reload

# In another terminal, run the test script
python scripts/test_logging.py
```

## Troubleshooting

### Logs Not Appearing

1. Check `LOG_LEVEL` in `.env` - ensure it's not set too high
2. Verify `LOG_FORMAT` is set to `json`
3. Check that middleware is registered in `main.py`

### JSON Not Formatted

Ensure `LOG_FORMAT=json` in `.env`. For development, use `LOG_FORMAT=console` for colored output.

### Missing User Context

User context is only added to authenticated requests. Ensure:
1. Request includes valid JWT token
2. Auth dependency is working correctly
3. `request.state.user` is set by auth middleware

### High Log Volume

Consider:
1. Increasing excluded paths
2. Raising `LOG_LEVEL` to `WARNING` or `ERROR`
3. Implementing log sampling for high-traffic endpoints

## Best Practices

1. **Always use structured logging**: Use keyword arguments, not string formatting
   ```python
   # Good
   logger.info("Expense created", expense_id=expense.id)

   # Bad
   logger.info(f"Expense created: {expense.id}")
   ```

2. **Include relevant context**: Add user_id, tenant_id, and entity IDs

3. **Use appropriate log levels**:
   - DEBUG: Detailed diagnostic info
   - INFO: Normal operations
   - WARNING: Unexpected but handled situations
   - ERROR: Actual errors requiring attention

4. **Don't log sensitive data**: Avoid PII, passwords, tokens

5. **Use request_id for correlation**: Include request_id when logging across multiple functions

6. **Log exceptions with context**: Use `exc_info=True` to include stack traces

## Future Enhancements

- [ ] Add distributed tracing integration (OpenTelemetry)
- [ ] Implement log sampling for high-volume endpoints
- [ ] Add metrics collection (Prometheus)
- [ ] Implement audit logging for sensitive operations
- [ ] Add log rotation and archiving
- [ ] Implement structured error reporting (Sentry integration)

## References

- [Structlog Documentation](https://www.structlog.org/)
- [Logging Best Practices](https://12factor.net/logs)
- [Python Logging Cookbook](https://docs.python.org/3/howto/logging-cookbook.html)
