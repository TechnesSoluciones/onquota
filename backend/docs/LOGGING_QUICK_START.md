# Logging Quick Start Guide

Quick reference for using structured logging in OnQuota.

## Getting Started

### 1. Import Logger

```python
from core.logging_config import get_logger

logger = get_logger(__name__)
```

### 2. Log with Context

```python
# Good - structured logging
logger.info(
    "User logged in",
    user_id=user.id,
    tenant_id=user.tenant_id,
    ip_address=request.client.host
)

# Bad - string formatting
logger.info(f"User {user.id} logged in")  # ❌ Don't do this
```

## Common Patterns

### Log Levels

```python
# INFO - Normal operations
logger.info("Expense created", expense_id=expense.id)

# WARNING - Unexpected but handled
logger.warning(
    "Expense exceeds budget",
    expense_id=expense.id,
    amount=expense.amount,
    budget=category.budget
)

# ERROR - Actual errors
logger.error(
    "Failed to process payment",
    expense_id=expense.id,
    error=str(e),
    exc_info=True  # Include stack trace
)

# DEBUG - Detailed diagnostic info
logger.debug(
    "Processing expense",
    expense_id=expense.id,
    step="validation"
)
```

### Error Logging

```python
try:
    result = process_expense(expense)
except ValidationError as e:
    logger.error(
        "Expense validation failed",
        expense_id=expense.id,
        errors=e.errors(),
        exc_info=True
    )
    raise
except Exception as e:
    logger.error(
        "Unexpected error processing expense",
        expense_id=expense.id,
        error=str(e),
        exc_info=True
    )
    raise
```

### User Context

```python
# Always include user and tenant context
logger.info(
    "Quote generated",
    quote_id=quote.id,
    client_id=quote.client_id,
    total_amount=quote.total_amount,
    user_id=current_user.id,
    tenant_id=current_user.tenant_id
)
```

### Performance Logging

```python
import time

start = time.time()
result = expensive_operation()
duration = time.time() - start

logger.info(
    "Expensive operation completed",
    duration_seconds=round(duration, 2),
    operation="data_export",
    record_count=len(result)
)
```

### Business Events

```python
# Important business events
logger.info(
    "Payment received",
    amount=payment.amount,
    currency=payment.currency,
    client_id=payment.client_id,
    payment_method=payment.method,
    user_id=current_user.id,
    tenant_id=current_user.tenant_id
)
```

## What to Log

### ✅ DO Log

- Important business events (payments, quotes, sales)
- Errors and exceptions (with context)
- Performance metrics (slow operations)
- User actions (login, logout, critical changes)
- External API calls (success/failure)
- Background job status
- Security events (failed auth, suspicious activity)

### ❌ DON'T Log

- Passwords or tokens
- Credit card numbers
- SSN or personal identification numbers
- Full user emails (use user_id instead)
- Request/response bodies by default
- Sensitive customer data

## Request Context

The middleware automatically logs:
- request_id (UUID)
- method, path, query_params
- client_ip, user_agent
- user_id, tenant_id (if authenticated)
- status_code, duration_ms
- response_size_bytes

You don't need to log these manually!

## Finding Logs

### By Request ID
```bash
cat app.log | jq 'select(.request_id == "REQUEST_ID_HERE")'
```

### By User
```bash
cat app.log | jq 'select(.user_id == "USER_ID_HERE")'
```

### By Tenant
```bash
cat app.log | jq 'select(.tenant_id == "TENANT_ID_HERE")'
```

### Errors Only
```bash
cat app.log | jq 'select(.level == "error")'
```

### Slow Requests
```bash
cat app.log | jq 'select(.duration_ms > 1000)'
```

## Configuration

### Development (.env)
```bash
LOG_LEVEL=DEBUG
LOG_FORMAT=console  # Colored, readable output
```

### Production (.env)
```bash
LOG_LEVEL=INFO
LOG_FORMAT=json     # Structured, parseable output
```

## Best Practices

1. **Use keyword arguments**
   ```python
   # Good
   logger.info("Event occurred", user_id=user.id, count=5)

   # Bad
   logger.info(f"Event occurred for user {user.id}")
   ```

2. **Include relevant IDs**
   ```python
   logger.info(
       "Record updated",
       record_id=record.id,
       record_type="expense",
       user_id=user.id,
       tenant_id=user.tenant_id
   )
   ```

3. **Use exc_info for exceptions**
   ```python
   try:
       dangerous_operation()
   except Exception as e:
       logger.error("Operation failed", error=str(e), exc_info=True)
       raise
   ```

4. **Log at appropriate levels**
   - DEBUG: Detailed diagnostic info
   - INFO: Normal operations
   - WARNING: Unexpected but handled
   - ERROR: Actual errors
   - CRITICAL: System-level failures

5. **Keep messages concise**
   ```python
   # Good
   logger.info("Expense approved", expense_id=expense.id)

   # Bad
   logger.info("The expense with ID {} has been approved by user {}", expense.id, user.id)
   ```

6. **Don't log in loops (unless necessary)**
   ```python
   # Bad - logs every iteration
   for item in items:
       logger.debug("Processing item", item_id=item.id)

   # Good - log summary
   logger.info("Processing batch", item_count=len(items))
   ```

## Common Mistakes

### ❌ String Formatting
```python
logger.info(f"User {user.id} logged in")  # Don't do this
```

### ✅ Structured Data
```python
logger.info("User logged in", user_id=user.id)  # Do this
```

---

### ❌ Logging PII
```python
logger.info("User registered", email=user.email, phone=user.phone)
```

### ✅ Logging IDs
```python
logger.info("User registered", user_id=user.id, tenant_id=user.tenant_id)
```

---

### ❌ Missing Context
```python
logger.error("Database error")
```

### ✅ With Context
```python
logger.error(
    "Database error",
    operation="insert",
    table="expenses",
    error=str(e),
    exc_info=True
)
```

## Need Help?

- Full documentation: `docs/LOGGING.md`
- Implementation guide: `LOGGING_IMPLEMENTATION.md`
- Test examples: `tests/unit/test_logging_middleware.py`
- Manual testing: `python3 scripts/test_logging.py`
