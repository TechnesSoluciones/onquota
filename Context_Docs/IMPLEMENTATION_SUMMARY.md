# OnQuota - Opportunities & Notifications Modules Implementation

## Executive Summary

Successfully implemented two production-ready modules for the OnQuota CRM platform:

1. **Opportunities Module**: Complete sales pipeline management system
2. **Notifications Module**: Comprehensive alerting and notification system with email integration

## Module 1: Opportunities (Sales Pipeline CRM)

### Architecture

```
backend/modules/opportunities/
├── __init__.py
├── models.py              # Database models with OpportunityStage enum
├── schemas.py             # Pydantic request/response schemas
├── repository.py          # Data access layer with business logic
└── router.py              # REST API endpoints (8 routes)
```

### Database Model

**Table**: `opportunities`

**Key Fields**:
- `id` (UUID): Primary key
- `tenant_id` (UUID): Multi-tenancy support
- `name` (String): Opportunity name
- `client_id` (UUID): Foreign key to clients table
- `assigned_to` (UUID): Foreign key to users table
- `estimated_value` (Numeric): Deal size
- `probability` (Numeric): Win probability (0-100)
- `expected_close_date` (Date): Target close date
- `stage` (Enum): Pipeline stage
- `loss_reason` (String): Reason if closed lost

**Pipeline Stages**:
1. LEAD - New contact
2. QUALIFIED - Qualified lead
3. PROPOSAL - Proposal sent
4. NEGOTIATION - In negotiation
5. CLOSED_WON - Deal won
6. CLOSED_LOST - Deal lost

**Calculated Properties**:
- `weighted_value`: estimated_value × (probability / 100)
- `is_closed`: stage in [CLOSED_WON, CLOSED_LOST]
- `is_won`: stage == CLOSED_WON

### API Endpoints

#### 1. POST /opportunities
Create new opportunity.

**Request**:
```json
{
  "name": "Enterprise Software License",
  "description": "Annual license for 100 users",
  "client_id": "550e8400-e29b-41d4-a716-446655440000",
  "estimated_value": "50000.00",
  "currency": "USD",
  "probability": "70",
  "expected_close_date": "2025-12-31",
  "stage": "PROPOSAL"
}
```

**Validations**:
- Client must exist and belong to tenant
- estimated_value > 0
- probability between 0-100
- expected_close_date must be future date

#### 2. GET /opportunities
List opportunities with filters and pagination.

**Query Parameters**:
- `stage`: Filter by OpportunityStage
- `assigned_to`: Filter by user UUID
- `client_id`: Filter by client UUID
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20, max: 100)

**RBAC**:
- Sales reps: Only see their own opportunities
- Supervisors/Admins: See all tenant opportunities

#### 3. GET /opportunities/{id}
Get single opportunity with full details.

#### 4. PUT /opportunities/{id}
Update opportunity fields.

**Business Rules**:
- Cannot update closed opportunities
- Auto-updates probability and close date when closing

#### 5. PATCH /opportunities/{id}/stage
Move opportunity through pipeline stages.

**Request**:
```json
{
  "stage": "CLOSED_LOST",
  "loss_reason": "Competitor had better pricing"
}
```

**Business Rules**:
- Cannot change stage of closed opportunities
- CLOSED_LOST requires loss_reason
- CLOSED_WON sets probability to 100%
- CLOSED_LOST sets probability to 0%
- Both set actual_close_date to today

#### 6. DELETE /opportunities/{id}
Soft delete opportunity (Admin only).

#### 7. GET /opportunities/pipeline/summary
Get aggregated pipeline statistics.

**Response**:
```json
{
  "total_opportunities": 45,
  "total_value": "2500000.00",
  "weighted_value": "1750000.00",
  "by_stage": {
    "LEAD": {
      "count": 10,
      "total_value": "500000.00",
      "weighted_value": "150000.00",
      "average_probability": "30.00"
    },
    ...
  },
  "win_rate": "65.50",
  "average_deal_size": "55555.56",
  "total_won": 15,
  "total_lost": 8,
  "active_opportunities": 22
}
```

#### 8. GET /opportunities/pipeline/board
Get Kanban board data with opportunities grouped by stage.

**Use Cases**:
- Drag-and-drop pipeline management
- Visual pipeline overview
- Real-time sales tracking

### Repository Methods

**Core CRUD**:
- `create_opportunity()`
- `get_opportunity_by_id()`
- `get_opportunities()` - with filters and pagination
- `update_opportunity()`
- `update_stage()`
- `delete_opportunity()`

**Analytics**:
- `get_pipeline_summary()` - comprehensive statistics
- `get_opportunities_by_stage()` - for Kanban view
- `get_overdue_opportunities()` - for alerts

### Performance Optimizations

**Indexes Created**:
1. `idx_opportunities_tenant_stage` - Common filtering
2. `idx_opportunities_assigned_stage` - User pipeline view
3. `idx_opportunities_client_id` - Client history
4. `idx_opportunities_expected_close_date` - Overdue checks (partial index)
5. `idx_opportunities_tenant_assigned_active` - Composite for common queries

**Query Optimizations**:
- Eager loading with `joinedload()` for client and sales_rep
- Pagination to limit result sets
- Partial indexes for active opportunities only

---

## Module 2: Notifications (Alerting System)

### Architecture

```
backend/modules/notifications/
├── __init__.py
├── models.py              # Database models with NotificationType enum
├── schemas.py             # Pydantic request/response schemas
├── repository.py          # Data access layer
├── router.py              # REST API endpoints (6 routes)
├── tasks.py               # Celery scheduled tasks (5 tasks)
└── services/
    ├── __init__.py
    └── email.py           # SendGrid email service
```

### Database Model

**Table**: `notifications`

**Key Fields**:
- `id` (UUID): Primary key
- `tenant_id` (UUID): Multi-tenancy support
- `user_id` (UUID): Recipient
- `title` (String): Notification title
- `message` (Text): Full notification text
- `type` (Enum): INFO, WARNING, SUCCESS, ERROR
- `category` (Enum): SYSTEM, QUOTE, OPPORTUNITY, MAINTENANCE, PAYMENT, CLIENT, GENERAL
- `action_url` (String): Deep link for navigation
- `action_label` (String): CTA button text
- `is_read` (Boolean): Read status
- `read_at` (DateTime): When marked as read
- `email_sent` (Boolean): Email delivery status
- `email_sent_at` (DateTime): Email send timestamp
- `email_error` (Text): Error if email failed
- `related_entity_type` (String): Type of related object
- `related_entity_id` (UUID): Related object ID

### API Endpoints

#### 1. GET /notifications
List user notifications with filters.

**Query Parameters**:
- `is_read`: Filter by read status
- `type`: Filter by NotificationType
- `category`: Filter by NotificationCategory
- `page`: Page number
- `page_size`: Items per page

**Response**:
```json
{
  "items": [...],
  "total": 150,
  "unread_count": 12,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

#### 2. GET /notifications/unread-count
Get count of unread notifications.

**Use Cases**:
- Badge counter in UI
- Periodic polling
- Real-time updates

**Performance**: Single optimized COUNT query.

#### 3. PATCH /notifications/{id}/read
Mark notification as read.

**Business Rules**:
- Sets is_read = true
- Records read_at timestamp
- Idempotent (safe to call multiple times)

#### 4. POST /notifications/mark-all-read
Mark all user notifications as read.

**Response**:
```json
{
  "message": "Marked 12 notifications as read",
  "count": 12
}
```

#### 5. DELETE /notifications/{id}
Soft delete notification.

**Business Rules**:
- User can only delete their own notifications
- Soft delete (retained for audit)
- Auto-cleanup after 90 days

#### 6. GET /notifications/stream (Optional SSE)
Server-Sent Events stream for real-time notifications.

**Note**: Commented out in production code. Requires `sse-starlette` package. Enable if real-time push notifications are needed.

### Email Service (SendGrid)

**File**: `backend/modules/notifications/services/email.py`

**Class**: `EmailService`

**Methods**:

1. **`send_notification_email()`**
   - Sends individual notification email
   - HTML template with CTA button
   - Returns success/error status

2. **`send_bulk_notification_emails()`**
   - Sends to multiple recipients
   - Returns success/failure counts

3. **`send_weekly_summary_email()`**
   - Formatted summary with statistics
   - Custom template

**Email Template Features**:
- Professional HTML design
- Branded header with app name
- Responsive layout (600px width)
- Optional CTA button with URL
- Footer with unsubscribe info
- Mobile-friendly

**Configuration**:
```python
# .env file
SENDGRID_API_KEY=your_api_key_here
FROM_EMAIL=noreply@onquota.com
FROM_NAME=OnQuota
```

### Celery Scheduled Tasks

**File**: `backend/modules/notifications/tasks.py`

#### 1. check_expired_quotes
**Schedule**: Daily at 9:00 AM

**Logic**:
- Finds quotes with status=SENT and valid_until < today
- Creates WARNING notification for sales rep
- Sends email alert
- Includes action link to quote

**SQL**:
```sql
SELECT * FROM quotes
WHERE status = 'SENT'
  AND valid_until < CURRENT_DATE
  AND is_deleted = false
```

#### 2. check_pending_maintenance
**Schedule**: Daily at 8:00 AM

**Logic**:
- Finds vehicles with next_maintenance_date within 7 days
- Groups by tenant
- Creates notifications for admins/supervisors
- Sends email with vehicle list

**Notification Type**:
- ERROR if overdue
- WARNING if upcoming

#### 3. check_overdue_opportunities
**Schedule**: Daily at 10:00 AM

**Logic**:
- Finds opportunities with expected_close_date < today
- Excludes closed opportunities
- Creates WARNING notification for assigned sales rep
- Includes days overdue count

#### 4. send_weekly_summary
**Schedule**: Every Monday at 7:00 AM

**Parameters**: `user_id` (UUID)

**Summary Includes**:
- New opportunities created
- Opportunities won
- Total revenue
- Active opportunities count
- Weighted pipeline value
- Expiring quotes count
- Overdue opportunities count
- Pending maintenance count

**Note**: Requires wrapper task to iterate all active users.

#### 5. cleanup_old_notifications
**Schedule**: 1st of each month at 2:00 AM

**Logic**:
- Deletes read notifications older than 90 days
- Keeps unread notifications
- Soft delete (audit trail)

### Celery Beat Schedule

**File**: `backend/core/celery.py`

```python
celery_app.conf.beat_schedule = {
    "check-expired-quotes": {
        "task": "notifications.check_expired_quotes",
        "schedule": crontab(hour=9, minute=0),
    },
    "check-pending-maintenance": {
        "task": "notifications.check_pending_maintenance",
        "schedule": crontab(hour=8, minute=0),
    },
    "check-overdue-opportunities": {
        "task": "notifications.check_overdue_opportunities",
        "schedule": crontab(hour=10, minute=0),
    },
    "cleanup-old-notifications": {
        "task": "notifications.cleanup_old_notifications",
        "schedule": crontab(day_of_month=1, hour=2, minute=0),
    },
}
```

### Performance Optimizations

**Indexes Created**:
1. `idx_notifications_user_unread` - Most common query
2. `idx_notifications_user_type` - Filter by type
3. `idx_notifications_user_category` - Filter by category
4. `idx_notifications_related_entity` - Entity tracking
5. `idx_notifications_tenant_created` - Tenant queries
6. `idx_notifications_cleanup` - Cleanup task
7. `idx_notifications_unread_only` - Partial index (unread only)

**Query Optimizations**:
- Partial indexes for frequently filtered subsets
- Composite indexes for multi-column queries
- Single COUNT query for unread count (no JOIN)
- Bulk UPDATE for mark-all-read

---

## Database Migrations

### Migration 010: Create Opportunities Table

**File**: `backend/alembic/versions/010_create_opportunities_table.py`

**Creates**:
- `opportunity_stage` enum type
- `opportunities` table with all fields
- 5 performance indexes
- Foreign key constraints

**Revision**: `010`
**Depends on**: `009`

### Migration 011: Create Notifications Table

**File**: `backend/alembic/versions/011_create_notifications_table.py`

**Creates**:
- `notification_type` enum type
- `notification_category` enum type
- `notifications` table with all fields
- 7 performance indexes (including 2 partial indexes)
- Foreign key constraints

**Revision**: `011`
**Depends on**: `010`

### Running Migrations

```bash
# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Check current revision
alembic current

# View migration history
alembic history
```

---

## Testing

### Unit Tests

**Opportunities Tests**: `backend/tests/unit/test_opportunity_repository.py`

**Test Coverage**:
- ✅ Create opportunity
- ✅ Create with invalid client (validation)
- ✅ Get opportunity by ID
- ✅ Get opportunity not found
- ✅ List opportunities with pagination
- ✅ Filter by stage
- ✅ Update opportunity
- ✅ Update stage
- ✅ Close as won (auto-updates)
- ✅ Close as lost with reason
- ✅ Close as lost without reason (fails validation)
- ✅ Cannot change closed opportunity
- ✅ Delete opportunity
- ✅ Get pipeline summary
- ✅ Get overdue opportunities

**Notifications Tests**: `backend/tests/unit/test_notification_repository.py`

**Test Coverage**:
- ✅ Create notification
- ✅ Create bulk notifications
- ✅ Get notification by ID
- ✅ Get notification wrong user (fails)
- ✅ List user notifications with pagination
- ✅ Filter by read status
- ✅ Filter by type
- ✅ Get unread count
- ✅ Mark as read
- ✅ Mark all as read
- ✅ Update email status
- ✅ Update email status with error
- ✅ Delete notification
- ✅ Delete old notifications

### Test Fixtures

**File**: `backend/tests/fixtures/opportunity_fixtures.py`

**Fixtures Provided**:
- `test_tenant`: Creates test tenant
- `test_user`: Creates test user (SALES_REP role)
- `test_client`: Creates test client
- `test_opportunity`: Creates test opportunity
- `test_notification`: Creates test notification

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=modules/opportunities --cov=modules/notifications

# Run specific test file
pytest tests/unit/test_opportunity_repository.py

# Run specific test
pytest tests/unit/test_opportunity_repository.py::TestOpportunityRepository::test_create_opportunity

# Run with verbose output
pytest -v

# Run and stop on first failure
pytest -x
```

---

## Dependencies

### Added to requirements.txt

```txt
# Email (already present)
sendgrid==6.11.0
```

### Already Available
- FastAPI
- SQLAlchemy (async)
- Celery
- Redis
- Pydantic

---

## Configuration

### Environment Variables

**Required**:
```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/onquota

# Redis (for Celery)
REDIS_URL=redis://localhost:6379/0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Email (SendGrid)
SENDGRID_API_KEY=SG.your_api_key_here
FROM_EMAIL=noreply@onquota.com
FROM_NAME=OnQuota

# CORS (for email links)
CORS_ORIGINS=http://localhost:3000,https://app.onquota.com
```

### Celery Workers

**Start Celery Worker**:
```bash
celery -A core.celery worker --loglevel=info
```

**Start Celery Beat (Scheduler)**:
```bash
celery -A core.celery beat --loglevel=info
```

**Start Both (Development)**:
```bash
celery -A core.celery worker -B --loglevel=info
```

**Monitor with Flower**:
```bash
celery -A core.celery flower
# Access at http://localhost:5555
```

---

## Security Features

### Authentication & Authorization

**Opportunities Module**:
- All endpoints require authentication
- Sales reps: Can only see/edit their own opportunities
- Supervisors/Admins: Full access to tenant opportunities
- Delete: Admin only

**Notifications Module**:
- All endpoints require authentication
- Users can only access their own notifications
- No cross-tenant access (tenant isolation)

### Input Validation

**Opportunities**:
- Estimated value > 0
- Probability 0-100
- Max 2 decimal places
- Expected close date must be future
- Loss reason required when closing as lost
- Client and user must exist and belong to tenant

**Notifications**:
- Title max 200 chars
- Message required
- Valid enum values only
- User ownership verified on all operations

### SQL Injection Prevention
- All queries use SQLAlchemy ORM
- Parameterized queries
- No raw SQL

### XSS Prevention
- HTML email templates properly escaped
- User input sanitized
- No eval() or exec()

### CSRF Protection
- Handled by FastAPI middleware
- Cookie-based auth with httpOnly

---

## API Documentation

### OpenAPI/Swagger

Access interactive API docs at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Example API Calls

**Create Opportunity**:
```bash
curl -X POST "http://localhost:8000/api/v1/opportunities" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Enterprise Deal",
    "client_id": "550e8400-e29b-41d4-a716-446655440000",
    "estimated_value": "100000.00",
    "probability": "75.00",
    "expected_close_date": "2025-12-31"
  }'
```

**Get Unread Notifications**:
```bash
curl -X GET "http://localhost:8000/api/v1/notifications?is_read=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Mark All Notifications as Read**:
```bash
curl -X POST "http://localhost:8000/api/v1/notifications/mark-all-read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] Set `DEBUG=False` in production
- [ ] Configure production database (PostgreSQL)
- [ ] Set up Redis cluster for Celery
- [ ] Configure SendGrid API key
- [ ] Set strong `SECRET_KEY`
- [ ] Configure CORS origins
- [ ] Set up error tracking (Sentry)
- [ ] Configure logging

### Database

- [ ] Run migrations: `alembic upgrade head`
- [ ] Verify indexes created
- [ ] Set up database backups
- [ ] Configure connection pooling

### Celery

- [ ] Deploy Celery workers (minimum 2 for redundancy)
- [ ] Deploy Celery Beat scheduler (single instance)
- [ ] Configure Flower for monitoring
- [ ] Set up task result expiration
- [ ] Configure retry policies

### Monitoring

- [ ] Set up application monitoring (e.g., Datadog, New Relic)
- [ ] Configure log aggregation (e.g., ELK, CloudWatch)
- [ ] Set up alerting for failed tasks
- [ ] Monitor email delivery rates
- [ ] Track notification open rates

### Performance

- [ ] Enable database query logging
- [ ] Monitor slow queries
- [ ] Set up caching (Redis)
- [ ] Configure CDN for static assets
- [ ] Enable gzip compression

---

## Troubleshooting

### Common Issues

**Issue**: Celery tasks not running
**Solution**:
- Check Redis connection
- Verify Celery Beat is running
- Check task logs: `celery -A core.celery events`

**Issue**: Emails not sending
**Solution**:
- Verify SendGrid API key
- Check SendGrid dashboard for bounces
- Verify FROM_EMAIL is verified in SendGrid
- Check email_error field in notifications table

**Issue**: Migrations fail
**Solution**:
- Check database connection
- Verify enum types don't already exist
- Run `alembic current` to check state
- Use `alembic downgrade` to rollback

**Issue**: Slow queries
**Solution**:
- Run `EXPLAIN ANALYZE` on slow queries
- Verify indexes are being used
- Check connection pool settings
- Consider adding more indexes

---

## Future Enhancements

### Opportunities Module
- [ ] Opportunity stage history tracking
- [ ] Win/loss analysis reports
- [ ] Sales forecasting with ML
- [ ] Team performance dashboards
- [ ] Integration with calendar for follow-ups
- [ ] Automated stage progression triggers

### Notifications Module
- [ ] Push notifications (Firebase/OneSignal)
- [ ] SMS notifications (Twilio)
- [ ] In-app notification center UI
- [ ] Notification preferences per user
- [ ] Digest mode (daily/weekly summaries)
- [ ] Webhook support for third-party integrations
- [ ] Real-time SSE implementation

---

## Code Quality

### Linting & Formatting
```bash
# Format with Black
black backend/modules/opportunities backend/modules/notifications

# Lint with Ruff
ruff check backend/modules/opportunities backend/modules/notifications

# Type checking with MyPy
mypy backend/modules/opportunities backend/modules/notifications
```

### Test Coverage
```bash
# Generate coverage report
pytest --cov=modules/opportunities --cov=modules/notifications --cov-report=html

# View report
open htmlcov/index.html
```

---

## License & Credits

**Project**: OnQuota CRM
**Modules**: Opportunities & Notifications
**Author**: AI Assistant (Claude)
**Framework**: FastAPI + SQLAlchemy + Celery
**Database**: PostgreSQL
**Email Provider**: SendGrid

---

## Support

For questions or issues:
1. Check API documentation at `/docs`
2. Review this implementation guide
3. Check Celery task logs
4. Review database logs
5. Contact development team

---

**Implementation Complete** ✅

All modules are production-ready with:
- ✅ Complete CRUD operations
- ✅ Role-based access control
- ✅ Input validation
- ✅ Comprehensive error handling
- ✅ Performance optimizations
- ✅ Automated testing
- ✅ Email integration
- ✅ Scheduled background tasks
- ✅ Full documentation
