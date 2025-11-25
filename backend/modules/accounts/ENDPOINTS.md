# Account Planner API Endpoints

Base URL: `/api/v1/accounts`

## Authentication
All endpoints require authentication via JWT token in httpOnly cookie or Authorization header.

## Account Plans

### 1. Create Account Plan
**POST** `/plans`

**Access:** Admin, SalesRep

**Request Body:**
```json
{
  "title": "Q4 2025 Growth Strategy",
  "description": "Strategic plan for expanding enterprise services",
  "client_id": "550e8400-e29b-41d4-a716-446655440000",
  "start_date": "2025-10-01",
  "end_date": "2025-12-31",
  "revenue_goal": "250000.00",
  "status": "active"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "title": "Q4 2025 Growth Strategy",
  "description": "Strategic plan for expanding enterprise services",
  "client_id": "uuid",
  "client_name": "Acme Corp",
  "created_by": "uuid",
  "creator_name": "John Doe",
  "status": "active",
  "start_date": "2025-10-01",
  "end_date": "2025-12-31",
  "revenue_goal": "250000.00",
  "milestones_count": 0,
  "completed_milestones_count": 0,
  "progress_percentage": 0.0,
  "created_at": "2025-11-15T10:00:00Z",
  "updated_at": "2025-11-15T10:00:00Z"
}
```

---

### 2. List Account Plans
**GET** `/plans`

**Access:** All authenticated users

**Query Parameters:**
- `client_id` (UUID, optional) - Filter by client
- `status` (string, optional) - Filter by status (draft, active, completed, cancelled)
- `page` (int, default: 1) - Page number
- `page_size` (int, default: 20, max: 100) - Items per page

**Response:** `200 OK`
```json
{
  "items": [...],
  "total": 45,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

---

### 3. Get Account Plan with Details
**GET** `/plans/{plan_id}`

**Access:** All authenticated users

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "title": "Q4 2025 Growth Strategy",
  "description": "Strategic plan...",
  "client_id": "uuid",
  "client_name": "Acme Corp",
  "created_by": "uuid",
  "creator_name": "John Doe",
  "status": "active",
  "start_date": "2025-10-01",
  "end_date": "2025-12-31",
  "revenue_goal": "250000.00",
  "milestones": [
    {
      "id": "uuid",
      "title": "Complete needs assessment",
      "description": "...",
      "due_date": "2025-11-30",
      "status": "pending",
      "is_completed": false,
      "is_overdue": false,
      ...
    }
  ],
  "swot_items": [
    {
      "id": "uuid",
      "category": "strength",
      "description": "Strong C-level relationships",
      ...
    }
  ],
  "milestones_count": 5,
  "completed_milestones_count": 2,
  "progress_percentage": 40.0,
  "created_at": "2025-11-15T10:00:00Z",
  "updated_at": "2025-11-15T10:00:00Z"
}
```

---

### 4. Update Account Plan
**PUT** `/plans/{plan_id}`

**Access:** Admin, SalesRep

**Request Body:**
```json
{
  "title": "Updated Plan Title",
  "status": "completed",
  "revenue_goal": "300000.00"
}
```

**Response:** `200 OK` - Same structure as Create Plan

---

### 5. Delete Account Plan
**DELETE** `/plans/{plan_id}`

**Access:** Admin, SalesRep

**Business Rule:** Cannot delete plans with completed milestones

**Response:** `204 No Content`

---

### 6. Get Plan Statistics
**GET** `/plans/{plan_id}/stats`

**Access:** All authenticated users

**Response:** `200 OK`
```json
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

---

## Milestones

### 7. Create Milestone
**POST** `/plans/{plan_id}/milestones`

**Access:** Admin, SalesRep

**Request Body:**
```json
{
  "title": "Complete needs assessment",
  "description": "Conduct comprehensive needs analysis",
  "due_date": "2025-11-30",
  "status": "pending"
}
```

**Validation:**
- `due_date` must be >= plan's `start_date`
- `due_date` must be <= plan's `end_date` (if set)

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "plan_id": "uuid",
  "title": "Complete needs assessment",
  "description": "Conduct comprehensive needs analysis",
  "due_date": "2025-11-30",
  "completion_date": null,
  "status": "pending",
  "is_completed": false,
  "is_overdue": false,
  "created_at": "2025-11-15T10:00:00Z",
  "updated_at": "2025-11-15T10:00:00Z"
}
```

---

### 8. Update Milestone
**PUT** `/milestones/{milestone_id}`

**Access:** Admin, SalesRep

**Request Body:**
```json
{
  "title": "Updated title",
  "status": "completed"
}
```

**Auto-behaviors:**
- Setting `status` to "completed" auto-sets `completion_date` to today
- Changing `status` from "completed" clears `completion_date`

**Response:** `200 OK` - Same structure as Create Milestone

---

### 9. Delete Milestone
**DELETE** `/milestones/{milestone_id}`

**Access:** Admin, SalesRep

**Response:** `204 No Content`

---

## SWOT Items

### 10. Create SWOT Item
**POST** `/plans/{plan_id}/swot`

**Access:** Admin, SalesRep

**Request Body:**
```json
{
  "category": "strength",
  "description": "Strong existing relationship with C-level executives"
}
```

**Categories:**
- `strength` - Internal positive attributes
- `weakness` - Internal negative attributes
- `opportunity` - External positive factors
- `threat` - External negative factors

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "plan_id": "uuid",
  "category": "strength",
  "description": "Strong existing relationship with C-level executives",
  "created_at": "2025-11-15T10:00:00Z"
}
```

---

### 11. Delete SWOT Item
**DELETE** `/swot/{swot_id}`

**Access:** Admin, SalesRep

**Response:** `204 No Content`

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "end_date must be after start_date"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Only Admin and SalesRep users can create account plans. Supervisor and Analyst users have read-only access."
}
```

### 404 Not Found
```json
{
  "detail": "AccountPlan with id xxx not found"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "revenue_goal"],
      "msg": "ensure this value is greater than 0",
      "type": "value_error.number.not_gt"
    }
  ]
}
```

---

## Role-Based Access Summary

| Endpoint | Admin | SalesRep | Supervisor | Analyst |
|----------|-------|----------|------------|---------|
| Create Plan | ✅ | ✅ | ❌ | ❌ |
| List Plans | ✅ | ✅ | ✅ | ✅ |
| Get Plan Details | ✅ | ✅ | ✅ | ✅ |
| Update Plan | ✅ | ✅ | ❌ | ❌ |
| Delete Plan | ✅ | ✅ | ❌ | ❌ |
| Get Stats | ✅ | ✅ | ✅ | ✅ |
| Create Milestone | ✅ | ✅ | ❌ | ❌ |
| Update Milestone | ✅ | ✅ | ❌ | ❌ |
| Delete Milestone | ✅ | ✅ | ❌ | ❌ |
| Create SWOT | ✅ | ✅ | ❌ | ❌ |
| Delete SWOT | ✅ | ✅ | ❌ | ❌ |

---

## Filtering and Pagination

All list endpoints support:
- **Pagination:** `?page=1&page_size=20`
- **Filtering:** Query parameters for specific fields
- **Sorting:** Default sort by `created_at DESC`

## Multi-tenant Isolation

All operations are automatically scoped to the authenticated user's tenant. Users cannot access plans from other tenants.
