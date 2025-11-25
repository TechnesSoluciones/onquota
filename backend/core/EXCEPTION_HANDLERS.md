# Exception Handler Middleware Documentation

## Overview

The exception handler middleware is a **critical security component** that prevents stack traces and sensitive information from being exposed to clients in production environments. This implementation follows OWASP security best practices and provides comprehensive error handling for the OnQuota API.

## Security Features

### 1. Information Sanitization
- **Stack traces**: Never exposed to clients
- **File paths**: Internal paths are stripped from responses
- **SQL queries**: Database queries are never shown to clients
- **Connection strings**: Database URLs and credentials are hidden
- **Environment variables**: Configuration secrets remain private
- **Internal error details**: Only generic messages are returned

### 2. Comprehensive Logging
- Full stack traces logged server-side for debugging
- Request metadata (path, method, client IP, user agent)
- Unique request IDs for error tracking and correlation
- Structured logging with proper log levels

### 3. User-Friendly Responses
- Clear, actionable error messages for clients
- Proper HTTP status codes
- Request IDs for support inquiries
- Validation errors with field-level details

## Exception Handlers

### 1. Global Exception Handler
**Purpose**: Catch-all for unhandled exceptions

**Catches**: `Exception` (all unhandled exceptions)

**Returns**:
```json
{
  "error": "Internal Server Error",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "An unexpected error occurred. Please contact support if the issue persists."
}
```

**Status Code**: 500 Internal Server Error

**Security**: No exception details are exposed. Full exception with stack trace is logged server-side.

### 2. HTTP Exception Handler
**Purpose**: Handle FastAPI HTTPException

**Catches**: `HTTPException`, `StarletteHTTPException`

**Behavior**:
- **4xx errors**: Exposes error details (client errors are safe to show)
- **5xx errors**: Hides details (server errors may contain sensitive info)

**Example Response**:
```json
{
  "error": "Not Found",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Resource not found",
  "status_code": 404
}
```

### 3. Validation Exception Handler
**Purpose**: Handle Pydantic validation errors

**Catches**: `RequestValidationError`, `PydanticValidationError`

**Returns**:
```json
{
  "error": "Validation Error",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "value is not a valid email address",
      "type": "value_error.email"
    },
    {
      "field": "age",
      "message": "ensure this value is greater than 0",
      "type": "value_error.number.not_gt"
    }
  ]
}
```

**Status Code**: 422 Unprocessable Entity

### 4. Database Exception Handler
**Purpose**: Handle SQLAlchemy database errors

**Catches**:
- `IntegrityError` (constraint violations)
- `OperationalError` (connection issues)
- `DataError` (invalid data types)
- `SQLAlchemyError` (generic database errors)

**Behavior by Exception Type**:

#### IntegrityError (409 Conflict)
```json
{
  "error": "Data integrity constraint violated",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "The operation conflicts with existing data. Please check your input."
}
```

#### OperationalError (503 Service Unavailable)
```json
{
  "error": "Database operational error",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Database service is temporarily unavailable. Please try again later."
}
```

#### DataError (400 Bad Request)
```json
{
  "error": "Database data error",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Invalid data format. Please check your input."
}
```

**Security**: SQL queries, table names, column names, and connection strings are NEVER exposed to clients.

### 5. OnQuota Exception Handler
**Purpose**: Handle custom application exceptions

**Catches**: `OnQuotaException` and subclasses:
- `NotFoundError` (404)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `ValidationError` (422)
- `DuplicateError` (409)
- `DatabaseError` (500)
- `ServiceUnavailableError` (503)
- `RateLimitExceededError` (429)

**Example Response**:
```json
{
  "error": "NotFoundError",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "User with id 123 not found"
}
```

## Implementation

### Registration Order
Exception handlers are registered in specific order (most specific to most general):

1. `OnQuotaException` - Custom application exceptions
2. `RequestValidationError` / `PydanticValidationError` - Validation errors
3. `SQLAlchemyError` - Database errors
4. `HTTPException` - HTTP exceptions
5. `Exception` - Global catch-all (must be last)

### Integration in main.py
```python
from core.exception_handlers import configure_exception_handlers

# Create FastAPI app
app = FastAPI(...)

# Configure exception handlers (after middleware setup)
configure_exception_handlers(app)
```

## Request ID Tracking

Every error response includes a unique `request_id` (UUID v4) for tracking and correlation:

**In Response Body**:
```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**In Response Headers**:
```
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

### Using Request IDs

**For Support Teams**:
- Users can provide the request_id when reporting errors
- Support can search logs for the specific request
- Full error details and stack traces are available in server logs

**For Monitoring**:
- Correlate errors across distributed systems
- Track error rates by request_id
- Analyze error patterns and trends

## Logging

All exception handlers log comprehensive details server-side:

### Log Levels
- `ERROR`: Unhandled exceptions, database errors
- `WARNING`: HTTP errors, validation errors, application errors

### Log Fields
```python
logger.error(
    "Unhandled exception occurred",
    exc_info=True,  # Includes full stack trace
    extra={
        "request_id": request_id,
        "path": request.url.path,
        "method": request.method,
        "client_host": client_host,
        "user_agent": user_agent,
        "exception_type": type(exc).__name__,
        "exception_message": str(exc),
    }
)
```

## Testing

Comprehensive test suite in `/tests/unit/test_exception_handlers.py`:

### Test Categories
1. **Sanitization Tests**: Verify no sensitive info is exposed
2. **Logging Tests**: Verify full details are logged server-side
3. **Status Code Tests**: Verify correct HTTP status codes
4. **Request ID Tests**: Verify request IDs are included
5. **Security Scenarios**: Test various attack vectors

### Running Tests
```bash
pytest tests/unit/test_exception_handlers.py -v
```

### Key Test Cases
- No stack traces in responses
- No file paths exposed
- No SQL queries exposed
- No connection strings exposed
- No environment variables exposed
- Request IDs in all responses
- Proper status codes for each exception type

## Security Best Practices

### 1. Never Expose Internal Details
```python
# ❌ BAD
return {"error": str(exc)}  # May contain sensitive info

# ✅ GOOD
return {"error": "Internal Server Error", "message": "Generic message"}
```

### 2. Always Log Full Details
```python
# ✅ GOOD
logger.error("Error occurred", exc_info=True, extra={...})
```

### 3. Use Specific Exception Types
```python
# ❌ BAD
raise Exception("User not found")

# ✅ GOOD
raise NotFoundError(resource="User", resource_id=user_id)
```

### 4. Differentiate Client vs Server Errors
- **4xx errors**: Safe to expose details (client's fault)
- **5xx errors**: Hide details (server's fault, may contain sensitive info)

## Production Considerations

### Environment-Based Behavior
The exception handlers respect the `DEBUG` setting:

```python
# In development (DEBUG=True)
- May include additional debug information
- More detailed validation errors

# In production (DEBUG=False)
- Minimal information exposure
- Generic error messages
- Full details only in logs
```

### Monitoring Integration
Exception handlers integrate with monitoring systems:

```python
# Example: Sentry integration
import sentry_sdk

# In exception handler
sentry_sdk.capture_exception(exc)
```

### Performance Impact
- Minimal overhead (~1-2ms per error)
- Async handlers for non-blocking operation
- Efficient logging with structured data

## Common Patterns

### Raising Custom Exceptions
```python
from core.exceptions import NotFoundError, ValidationError

# In repository
user = await get_user(user_id)
if not user:
    raise NotFoundError(resource="User", resource_id=user_id)

# In service
if not is_valid_email(email):
    raise ValidationError("Invalid email format", field="email")
```

### Database Error Handling
```python
from sqlalchemy.exc import IntegrityError

try:
    await db.commit()
except IntegrityError:
    # Handler will catch and sanitize
    # No need to catch and re-raise
    raise
```

### HTTP Exception Handling
```python
from fastapi import HTTPException, status

# Raise HTTPException (handler will format)
if not authorized:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions"
    )
```

## Troubleshooting

### Issue: Exception not being caught
**Solution**: Verify handler registration order. Custom exceptions must be registered before generic `Exception`.

### Issue: Stack traces still appearing
**Solution**: Check if DEBUG mode is enabled. In production, ensure `DEBUG=False`.

### Issue: Missing request IDs
**Solution**: Verify `X-Request-ID` header is not being stripped by proxy/load balancer.

### Issue: Too much/too little logging
**Solution**: Adjust `LOG_LEVEL` in settings (INFO, WARNING, ERROR, DEBUG).

## References

- [OWASP Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
- [FastAPI Exception Handling](https://fastapi.tiangolo.com/tutorial/handling-errors/)
- [SQLAlchemy Error Handling](https://docs.sqlalchemy.org/en/20/core/exceptions.html)
- [Pydantic Validation Errors](https://docs.pydantic.dev/latest/errors/errors/)

## Maintenance

### Adding New Exception Types
1. Define exception class in `/core/exceptions.py`
2. Create handler function in `/core/exception_handlers.py`
3. Register handler in `configure_exception_handlers()`
4. Add tests in `/tests/unit/test_exception_handlers.py`

### Updating Error Messages
1. Ensure messages are user-friendly and actionable
2. Never include internal details in client messages
3. Update tests to match new messages
4. Document message changes

## Support

For issues or questions about exception handling:
- Check server logs for full error details
- Search logs by request_id
- Review test cases for expected behavior
- Consult this documentation for security guidelines
