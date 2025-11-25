# Account Planner Module

Strategic account planning module for OnQuota SaaS platform.

## Overview

The Account Planner module enables sales teams to create and manage strategic account plans with milestones and SWOT analysis. It provides comprehensive tools for tracking client relationships, setting goals, and monitoring progress.

## Features

- **Strategic Planning**: Create detailed account plans with timelines and revenue goals
- **Milestone Tracking**: Define and track key milestones and deliverables
- **SWOT Analysis**: Document Strengths, Weaknesses, Opportunities, and Threats
- **Progress Monitoring**: Real-time progress tracking with completion metrics
- **Multi-tenant**: Full support for multi-tenant architecture
- **Role-based Access**: Granular permissions based on user roles

## Architecture

```
backend/modules/accounts/
├── __init__.py          # Module initialization
├── models.py            # SQLAlchemy models (AccountPlan, Milestone, SWOTItem)
├── schemas.py           # Pydantic schemas for validation
├── repository.py        # Data access layer with business logic
└── router.py            # FastAPI endpoints (11 routes)
```

## Models

### AccountPlan
- Strategic account plan with goals and timeline
- Links to Client and User (creator)
- Status: draft, active, completed, cancelled
- Optional revenue goals and end dates

### Milestone
- Key deliverables within an account plan
- Due dates and completion tracking
- Status: pending, in_progress, completed, cancelled
- Auto-validation against plan dates

### SWOTItem
- SWOT analysis items
- Categories: strength, weakness, opportunity, threat
- Free-text descriptions

## API Endpoints

### Account Plans (6 endpoints)
1. `POST /api/v1/accounts/plans` - Create new plan
2. `GET /api/v1/accounts/plans` - List plans (paginated, filterable)
3. `GET /api/v1/accounts/plans/{plan_id}` - Get plan with details
4. `PUT /api/v1/accounts/plans/{plan_id}` - Update plan
5. `DELETE /api/v1/accounts/plans/{plan_id}` - Delete plan
6. `GET /api/v1/accounts/plans/{plan_id}/stats` - Get plan statistics

### Milestones (3 endpoints)
7. `POST /api/v1/accounts/plans/{plan_id}/milestones` - Create milestone
8. `PUT /api/v1/accounts/milestones/{milestone_id}` - Update milestone
9. `DELETE /api/v1/accounts/milestones/{milestone_id}` - Delete milestone

### SWOT Items (2 endpoints)
10. `POST /api/v1/accounts/plans/{plan_id}/swot` - Create SWOT item
11. `DELETE /api/v1/accounts/swot/{swot_id}` - Delete SWOT item

## Access Control

### Create/Edit Operations (Admin, SalesRep)
- Create account plans
- Update account plans
- Create milestones
- Update milestones
- Create SWOT items
- Delete plans/milestones/SWOT items

### Read-Only Access (Supervisor, Analyst)
- View all plans
- View plan details
- View statistics

## Validation Rules

### Account Plans
- `end_date` must be after `start_date`
- `revenue_goal` must be positive (max 2 decimal places)
- Client must exist and belong to tenant
- Cannot delete plans with completed milestones

### Milestones
- `due_date` must be between plan's `start_date` and `end_date`
- Auto-sets `completion_date` when marked as completed
- Clears `completion_date` when status changed from completed

### SWOT Items
- Must belong to valid plan
- Category must be one of: strength, weakness, opportunity, threat

## Database Schema

### Tables Created
- `account_plans` - Strategic account plans
- `milestones` - Plan milestones and deliverables
- `swot_items` - SWOT analysis items

### Enums
- `plan_status` - draft, active, completed, cancelled
- `milestone_status` - pending, in_progress, completed, cancelled
- `swot_category` - strength, weakness, opportunity, threat

### Indexes
- Composite indexes for performance: `(tenant_id, client_id)`, `(tenant_id, status)`
- Partial indexes for active plans and pending milestones
- Foreign key indexes on all relationships

## Migration

Migration file: `backend/alembic/versions/012_create_account_planner_tables.py`

To apply migration:
```bash
cd backend
alembic upgrade head
```

To rollback:
```bash
alembic downgrade -1
```

## Testing

Test file: `backend/tests/unit/test_account_repository.py`

Run tests:
```bash
cd backend
pytest tests/unit/test_account_repository.py -v
```

Test coverage:
- Account Plan CRUD operations
- Milestone CRUD operations
- SWOT Item CRUD operations
- Statistics and analytics
- Validation rules
- Error handling
- Multi-tenant isolation

## Usage Examples

### Create Account Plan
```python
POST /api/v1/accounts/plans
{
  "title": "Q4 2025 Growth Strategy",
  "description": "Strategic plan for expanding enterprise services",
  "client_id": "uuid-here",
  "start_date": "2025-10-01",
  "end_date": "2025-12-31",
  "revenue_goal": "250000.00",
  "status": "active"
}
```

### Create Milestone
```python
POST /api/v1/accounts/plans/{plan_id}/milestones
{
  "title": "Complete needs assessment",
  "description": "Conduct comprehensive needs analysis",
  "due_date": "2025-11-30",
  "status": "pending"
}
```

### Create SWOT Item
```python
POST /api/v1/accounts/plans/{plan_id}/swot
{
  "category": "strength",
  "description": "Strong existing relationship with C-level executives"
}
```

### Get Plan Statistics
```python
GET /api/v1/accounts/plans/{plan_id}/stats

Response:
{
  "plan_id": "uuid",
  "title": "Q4 2025 Growth Strategy",
  "status": "active",
  "progress_percentage": 45.5,
  "milestones": {
    "total": 10,
    "pending": 3,
    "in_progress": 2,
    "completed": 4,
    "cancelled": 1,
    "overdue": 1,
    "completion_rate": 40.0
  },
  "swot": {
    "strengths_count": 5,
    "weaknesses_count": 3,
    "opportunities_count": 7,
    "threats_count": 2,
    "total_items": 17
  },
  "days_remaining": 45,
  "revenue_goal": "250000.00"
}
```

## Performance Considerations

- Lazy loading disabled for milestones and swot_items (use `selectin` strategy)
- Composite indexes on frequently queried columns
- Partial indexes for active/pending records only
- Soft deletes maintain referential integrity
- Pagination support for large datasets

## Security

- All endpoints require authentication
- Tenant isolation enforced at database level
- Role-based access control (RBAC)
- Input validation with Pydantic
- SQL injection prevention with parameterized queries
- Soft deletes for audit trails

## Future Enhancements

- [ ] Activity timeline for plans
- [ ] File attachments for milestones
- [ ] Email notifications for milestone deadlines
- [ ] Plan templates
- [ ] Collaboration features (comments, mentions)
- [ ] Export to PDF/Excel
- [ ] Integration with CRM systems
- [ ] AI-powered recommendations
