# FRONTEND VISUAL GUIDE - OnQuota

Guia visual con diagramas ASCII para entender rapidamente la arquitectura.

---

## FLUJO COMPLETO: Usuario a Backend

```
┌──────────────────────────────────────────────────────────────────────┐
│                       FLUJO DE UNA REQUEST                           │
└──────────────────────────────────────────────────────────────────────┘

1. USER ACTION
   │
   ├─► Clicks "Create Expense" button
   │
   ▼

2. COMPONENT (Client)
   │
   ├─► components/features/expenses/expense-form.tsx
   │   - React Hook Form captures data
   │   - Zod validates input
   │   - Calls mutation hook
   │
   ▼

3. MUTATION HOOK
   │
   ├─► hooks/mutations/use-create-expense.ts
   │   - useMutation from React Query
   │   - Calls API service
   │   - Handles optimistic updates
   │
   ▼

4. API SERVICE
   │
   ├─► lib/api/services/expenses.service.ts
   │   - Creates request object
   │   - Calls axios client
   │
   ▼

5. AXIOS CLIENT
   │
   ├─► lib/api/client.ts
   │   - Adds Authorization header (JWT)
   │   - Intercepts request
   │   - Sends HTTP POST
   │
   ▼

6. BACKEND API
   │
   ├─► FastAPI /api/v1/expenses/
   │   - Validates token
   │   - Processes request
   │   - Returns response
   │
   ▼

7. RESPONSE HANDLING
   │
   ├─► Axios interceptor
   │   - Handles errors
   │   - Refreshes token if 401
   │   - Returns data
   │
   ▼

8. MUTATION SUCCESS
   │
   ├─► React Query
   │   - Invalidates cache
   │   - Refetches expenses list
   │   - Calls onSuccess callback
   │
   ▼

9. UI UPDATE
   │
   ├─► Component re-renders
   │   - Shows success toast
   │   - Resets form
   │   - Updates list
   │
   ▼

10. USER SEES RESULT
    - New expense appears in list
    - Success notification shown
```

---

## ESTRUCTURA DE UN MODULO COMPLETO

```
MODULO: EXPENSES
================

app/(dashboard)/expenses/
│
├── page.tsx                          [SERVER COMPONENT]
│   │
│   ├─► Fetches initial data
│   ├─► Passes to client component
│   └─► Renders layout
│
├── loading.tsx                       [LOADING UI]
│   └─► Shows skeleton while loading
│
├── error.tsx                         [ERROR BOUNDARY]
│   └─► Catches errors in page
│
├── [id]/
│   ├── page.tsx                      [DETAIL PAGE]
│   └── edit/
│       └── page.tsx                  [EDIT PAGE]
│
└── new/
    └── page.tsx                      [CREATE PAGE]


components/features/expenses/
│
├── expense-form.tsx                  [CLIENT COMPONENT]
│   ├─► React Hook Form
│   ├─► Zod validation
│   └─► Mutation hook
│
├── expense-list.tsx                  [CLIENT COMPONENT]
│   ├─► Data fetching hook
│   ├─► Filters state
│   └─► Pagination
│
├── expense-card.tsx                  [PRESENTATIONAL]
│   └─► Pure UI component
│
├── expense-filters.tsx               [CLIENT COMPONENT]
│   ├─► Filter state
│   └─► URL params sync
│
└── expense-stats.tsx                 [CLIENT COMPONENT]
    └─► Charts with Recharts


lib/api/services/
│
└── expenses.service.ts               [API SERVICE]
    ├─► getAll(filters)
    ├─► getById(id)
    ├─► create(data)
    ├─► update(id, data)
    ├─► delete(id)
    ├─► approve(id)
    └─► reject(id, reason)


lib/validations/
│
└── expense.schemas.ts                [ZOD SCHEMAS]
    ├─► expenseCreateSchema
    ├─► expenseUpdateSchema
    └─► expenseFiltersSchema


hooks/api/
│
├── use-expenses.ts                   [QUERY HOOK]
│   ├─► useExpenses(filters)
│   └─► useExpense(id)
│
└── mutations/
    ├── use-create-expense.ts         [MUTATION HOOK]
    ├── use-update-expense.ts
    ├── use-delete-expense.ts
    └── use-approve-expense.ts


types/api/
│
└── expense.types.ts                  [TYPESCRIPT TYPES]
    ├─► Expense interface
    ├─► ExpenseStatus enum
    ├─► ExpenseCreateInput
    ├─► ExpenseUpdateInput
    ├─► ExpenseListResponse
    └─► ExpenseFilters
```

---

## COMPONENT COMPOSITION

```
PAGE STRUCTURE
==============

app/(dashboard)/expenses/page.tsx
│
└─► DashboardShell                    (components/layout/dashboard-shell.tsx)
    │
    ├─► Header                        (components/layout/header.tsx)
    │   ├─► UserAvatar
    │   ├─► Notifications
    │   └─► ThemeToggle
    │
    ├─► Sidebar                       (components/layout/sidebar.tsx)
    │   ├─► Logo
    │   ├─► Navigation
    │   └─► UserMenu
    │
    └─► Main Content
        │
        ├─► PageHeader
        │   ├─► Breadcrumbs
        │   ├─► Title
        │   └─► Actions
        │       └─► Button "New Expense"
        │
        ├─► ExpenseFilters            (features/expenses/expense-filters.tsx)
        │   ├─► SearchInput
        │   ├─► StatusSelect
        │   ├─► DateRangePicker
        │   └─► CategorySelect
        │
        ├─► ExpenseStats              (features/expenses/expense-stats.tsx)
        │   ├─► StatCard (Total)
        │   ├─► StatCard (Pending)
        │   ├─► StatCard (Approved)
        │   └─► StatCard (Rejected)
        │
        ├─► ExpenseList               (features/expenses/expense-list.tsx)
        │   ├─► DataTable             (shared/data-table.tsx)
        │   │   ├─► Table             (ui/table.tsx)
        │   │   │   ├─► TableHeader
        │   │   │   │   └─► TableRow
        │   │   │   │       └─► TableHead
        │   │   │   └─► TableBody
        │   │   │       └─► TableRow (x N)
        │   │   │           ├─► TableCell
        │   │   │           ├─► StatusBadge
        │   │   │           └─► DropdownMenu
        │   │   │               ├─► Edit
        │   │   │               ├─► Approve
        │   │   │               └─► Delete
        │   │   └─► EmptyState        (shared/empty-state.tsx)
        │   └─► Pagination            (shared/pagination.tsx)
        │
        └─► CreateExpenseDialog       (features/expenses/create-expense-dialog.tsx)
            └─► ExpenseForm           (features/expenses/expense-form.tsx)
                ├─► Form              (ui/form.tsx)
                │   ├─► FormField
                │   │   ├─► FormLabel
                │   │   ├─► FormControl
                │   │   │   └─► Input
                │   │   └─► FormMessage
                │   └─► Button
                └─► OCRUpload         (features/expenses/ocr-upload.tsx)
```

---

## DATA FLOW: React Query

```
CACHE HIERARCHY
===============

QueryClient (Global)
│
├─► expenses
│   │
│   ├─► list
│   │   ├─► { page: 1, status: 'pending' }     [CACHED]
│   │   ├─► { page: 2, status: 'pending' }     [CACHED]
│   │   └─► { page: 1, status: 'approved' }    [CACHED]
│   │
│   └─► detail
│       ├─► { id: 'uuid-1' }                    [CACHED]
│       ├─► { id: 'uuid-2' }                    [CACHED]
│       └─► { id: 'uuid-3' }                    [CACHED]
│
├─► clients
│   ├─► list
│   └─► detail
│
└─► sales
    ├─► quotations
    └─► opportunities


INVALIDATION FLOW
=================

1. User creates expense
   │
   ▼
2. useMutation.mutate()
   │
   ▼
3. onSuccess callback
   │
   ├─► queryClient.invalidateQueries(['expenses', 'list'])
   │   - All list queries refetch
   │
   └─► queryClient.invalidateQueries(['expenses', 'detail', id])
       - Specific detail query refetches


OPTIMISTIC UPDATE FLOW
======================

1. User updates expense
   │
   ▼
2. onMutate (before request)
   │
   ├─► Save current data (rollback)
   ├─► Update cache optimistically
   └─► UI updates immediately
   │
   ▼
3. Request sent to backend
   │
   ├─► Success: Keep optimistic update
   │
   └─► Error: Rollback to saved data
       │
       ▼
4. onSettled (always)
   │
   └─► Refetch to ensure sync
```

---

## AUTHENTICATION FLOW

```
LOGIN FLOW
==========

┌─────────────┐
│   User      │
│ enters creds│
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  LoginForm          │
│  (Client Component) │
│  - Validates with   │
│    Zod schema       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  useAuth hook       │
│  - Calls login()    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  authService.login()│
│  - POST /auth/login │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Backend Response   │
│  { access_token,    │
│    refresh_token }  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Store tokens       │
│  - httpOnly cookie  │
│    (recommended)    │
│  OR                 │
│  - localStorage     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Fetch user data    │
│  GET /auth/me       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Update auth store  │
│  - setUser(user)    │
│  - isAuthenticated  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Redirect           │
│  /dashboard         │
└─────────────────────┘


PROTECTED ROUTE FLOW
====================

┌─────────────┐
│   User      │
│ navigates to│
│ /dashboard  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Middleware         │
│  (middleware.ts)    │
│  - Check cookie     │
└──────┬──────────────┘
       │
       ├─► NOT AUTHENTICATED
       │   │
       │   ▼
       │   ┌─────────────────┐
       │   │ Redirect /login │
       │   │ ?from=/dashboard│
       │   └─────────────────┘
       │
       └─► AUTHENTICATED
           │
           ▼
           ┌─────────────────┐
           │ Allow access    │
           │ Render page     │
           └─────────────────┘


TOKEN REFRESH FLOW
==================

┌─────────────┐
│   User      │
│ makes API   │
│ request     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Axios interceptor  │
│  - Add Auth header  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Backend            │
│  - Returns 401      │
│    (token expired)  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Response           │
│  interceptor        │
│  - Detect 401       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Refresh token      │
│  POST /auth/refresh │
│  { refresh_token }  │
└──────┬──────────────┘
       │
       ├─► SUCCESS
       │   │
       │   ▼
       │   ┌─────────────────┐
       │   │ Store new token │
       │   │ Retry original  │
       │   │ request         │
       │   └─────────────────┘
       │
       └─► FAILURE
           │
           ▼
           ┌─────────────────┐
           │ Clear tokens    │
           │ Redirect /login │
           └─────────────────┘
```

---

## FORM VALIDATION FLOW

```
USER INPUT → VALIDATION → SUBMISSION
=====================================

┌─────────────┐
│   User      │
│ types in    │
│ form field  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  React Hook Form    │
│  - Tracks value     │
│  - onChange event   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Zod Schema         │
│  - Validates        │
│  - Returns errors   │
└──────┬──────────────┘
       │
       ├─► INVALID
       │   │
       │   ▼
       │   ┌─────────────────┐
       │   │ Show error msg  │
       │   │ Below field     │
       │   │ Disable submit  │
       │   └─────────────────┘
       │
       └─► VALID
           │
           ▼
           ┌─────────────────┐
           │ No error        │
           │ Enable submit   │
           └─────────────────┘


SUBMIT FLOW
===========

┌─────────────┐
│   User      │
│ clicks      │
│ submit      │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  handleSubmit()     │
│  - Final validation │
└──────┬──────────────┘
       │
       ├─► INVALID
       │   │
       │   ▼
       │   ┌─────────────────┐
       │   │ Show all errors │
       │   │ Focus 1st error │
       │   └─────────────────┘
       │
       └─► VALID
           │
           ▼
           ┌─────────────────┐
           │ onSubmit(data)  │
           │ - Transform     │
           │ - API call      │
           └──────┬──────────┘
                  │
                  ▼
           ┌─────────────────┐
           │ Loading state   │
           │ Disable form    │
           └──────┬──────────┘
                  │
                  ├─► SUCCESS
                  │   │
                  │   ▼
                  │   ┌─────────────────┐
                  │   │ Show toast      │
                  │   │ Reset form      │
                  │   │ Close modal     │
                  │   └─────────────────┘
                  │
                  └─► ERROR
                      │
                      ▼
                      ┌─────────────────┐
                      │ Show error      │
                      │ Enable form     │
                      └─────────────────┘
```

---

## STATE MANAGEMENT DECISION TREE

```
¿QUE TIPO DE STATE?
===================

┌─────────────────────┐
│  What kind of data  │
│  do you need to     │
│  manage?            │
└──────┬──────────────┘
       │
       ├─────────────────────────────────────────┐
       │                                         │
       ▼                                         ▼
┌──────────────────┐                    ┌────────────────┐
│  SERVER DATA     │                    │  CLIENT DATA   │
│  (from API)      │                    │  (UI state)    │
└──────┬───────────┘                    └────────┬───────┘
       │                                         │
       │                                         │
       ▼                                         ▼
┌──────────────────┐                    ┌────────────────────┐
│  USE:            │                    │  Is it global or   │
│  React Query     │                    │  local?            │
│  or SWR          │                    └────────┬───────────┘
└──────────────────┘                             │
                                                 ├─────────────┐
                                                 │             │
                                                 ▼             ▼
                                        ┌────────────┐  ┌───────────┐
                                        │   GLOBAL   │  │   LOCAL   │
                                        └─────┬──────┘  └─────┬─────┘
                                              │               │
                                              │               ▼
                                              │         ┌───────────┐
                                              │         │  USE:     │
                                              │         │  useState │
                                              │         │  useRef   │
                                              │         └───────────┘
                                              │
                                              ▼
                                        ┌─────────────────┐
                                        │  Is it shared   │
                                        │  across many    │
                                        │  components?    │
                                        └─────┬───────────┘
                                              │
                                              ├──────────┐
                                              │          │
                                              ▼          ▼
                                        ┌─────────┐  ┌──────────┐
                                        │   YES   │  │    NO    │
                                        └────┬────┘  └────┬─────┘
                                             │            │
                                             ▼            ▼
                                        ┌─────────┐  ┌──────────┐
                                        │  USE:   │  │  USE:    │
                                        │ Zustand │  │ Context  │
                                        │ or      │  │ API      │
                                        │ Context │  │          │
                                        └─────────┘  └──────────┘


EXAMPLES:
=========

SERVER DATA (React Query):
- Expenses list
- Client details
- User profile
- Sales statistics

GLOBAL CLIENT STATE (Zustand):
- Auth state (user, isAuthenticated)
- UI state (sidebar open/closed, theme)
- Filters (persisted across pages)
- Notifications queue

SHARED CLIENT STATE (Context):
- Theme
- Locale/Language
- Feature flags
- Tenant info

LOCAL CLIENT STATE (useState):
- Form input values
- Modal open/closed
- Tab selection
- Accordion expanded
```

---

## FILE NAMING DECISION TREE

```
¿DONDE VA MI ARCHIVO?
======================

┌─────────────────────┐
│  What are you       │
│  creating?          │
└──────┬──────────────┘
       │
       ├───────────────────────────────────────────────────┐
       │                                                   │
       ▼                                                   ▼
┌──────────────┐                                   ┌──────────────┐
│  COMPONENT   │                                   │  NOT A       │
└──────┬───────┘                                   │  COMPONENT   │
       │                                           └──────┬───────┘
       │                                                  │
       ▼                                                  │
┌──────────────────┐                                     │
│  Is it page,     │                                     │
│  layout, or      │                                     │
│  route-specific? │                                     │
└──────┬───────────┘                                     │
       │                                                  │
       ├────────────────┐                                │
       │                │                                │
       ▼                ▼                                ▼
┌──────────┐     ┌─────────────────┐           ┌────────────────┐
│   YES    │     │       NO        │           │  What is it?   │
└────┬─────┘     └────────┬────────┘           └────────┬───────┘
     │                    │                             │
     ▼                    │                             │
app/                      │                             │
(dashboard)/              │                             │
[module]/                 │                             │
page.tsx                  │                             │
                          │                             │
                          ▼                             │
                 ┌────────────────┐                     │
                 │  Is it UI      │                     │
                 │  primitive or  │                     │
                 │  business?     │                     │
                 └────────┬───────┘                     │
                          │                             │
                          ├──────────────┐              │
                          │              │              │
                          ▼              ▼              │
                  ┌──────────┐   ┌──────────────┐      │
                  │UI (shadcn)│   │  BUSINESS   │      │
                  └────┬──────┘   └──────┬───────┘      │
                       │                 │              │
                       ▼                 │              │
                 components/             │              │
                 ui/                     │              │
                 button.tsx              │              │
                                         │              │
                                         ▼              │
                              ┌──────────────────┐     │
                              │ Feature-specific │     │
                              │ or shared?       │     │
                              └────────┬─────────┘     │
                                       │               │
                                       ├───────┐       │
                                       │       │       │
                                       ▼       ▼       │
                              ┌─────────┐ ┌─────────┐ │
                              │FEATURE  │ │ SHARED  │ │
                              └────┬────┘ └────┬────┘ │
                                   │           │      │
                                   ▼           ▼      │
                         components/  components/     │
                         features/    shared/         │
                         expenses/    data-table.tsx  │
                         expense-                     │
                         form.tsx                     │
                                                      │
                                                      ▼
                                            ┌──────────────────┐
                                            │  - Hook?         │
                                            │  - Service?      │
                                            │  - Type?         │
                                            │  - Util?         │
                                            │  - Schema?       │
                                            │  - Store?        │
                                            └────────┬─────────┘
                                                     │
                                                     ├─────────────────┐
                                                     │                 │
                                                     ▼                 ▼
                                            hooks/          lib/api/services/
                                            use-expenses.ts expenses.service.ts
                                                                      │
                                                     ├────────────────┼────────┐
                                                     │                │        │
                                                     ▼                ▼        ▼
                                            lib/validations/  types/api/  store/
                                            expense.          expense.    auth.
                                            schemas.ts        types.ts    store.ts
```

---

## PERFORMANCE OPTIMIZATION CHECKLIST

```
OPTIMIZATION STRATEGIES
=======================

┌─────────────────────────────────────────────────────────────┐
│                    STRATEGY                  │   IMPACT     │
├─────────────────────────────────────────────────────────────┤
│ 1. Server Components (default)               │  ★★★★★       │
│    - Reduce JavaScript bundle                │              │
│    - Better initial load                     │              │
├─────────────────────────────────────────────────────────────┤
│ 2. Code Splitting                            │  ★★★★★       │
│    - Dynamic imports                         │              │
│    - Route-based splitting (automatic)       │              │
├─────────────────────────────────────────────────────────────┤
│ 3. Image Optimization                        │  ★★★★☆       │
│    - next/image                              │              │
│    - WebP/AVIF format                        │              │
│    - Lazy loading                            │              │
├─────────────────────────────────────────────────────────────┤
│ 4. React Query Caching                       │  ★★★★☆       │
│    - Reduce API calls                        │              │
│    - Stale-while-revalidate                  │              │
├─────────────────────────────────────────────────────────────┤
│ 5. Debounce Search Inputs                    │  ★★★☆☆       │
│    - Reduce unnecessary API calls            │              │
├─────────────────────────────────────────────────────────────┤
│ 6. Pagination (not infinite scroll)          │  ★★★★☆       │
│    - Limit data transfer                     │              │
│    - Better for large lists                  │              │
├─────────────────────────────────────────────────────────────┤
│ 7. Virtualization (long lists)               │  ★★★★☆       │
│    - react-window                            │              │
│    - Only render visible items               │              │
├─────────────────────────────────────────────────────────────┤
│ 8. Memoization                               │  ★★☆☆☆       │
│    - useMemo, useCallback (use sparingly)    │              │
│    - React.memo for expensive components     │              │
├─────────────────────────────────────────────────────────────┤
│ 9. Bundle Analysis                           │  ★★★★☆       │
│    - Identify large dependencies             │              │
│    - Replace heavy libraries                 │              │
├─────────────────────────────────────────────────────────────┤
│ 10. Prefetching                              │  ★★★☆☆       │
│     - Link prefetch (Next.js automatic)      │              │
│     - React Query prefetchQuery              │              │
└─────────────────────────────────────────────────────────────┘


BEFORE OPTIMIZATION:
Check if it's actually a problem!

┌─────────────┐
│  Measure    │
│  - Lighthouse│
│  - DevTools │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Identify   │
│  bottleneck │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Optimize   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Measure    │
│  again      │
└─────────────┘

Don't optimize prematurely!
```

---

**Version**: 1.0
**Fecha**: Noviembre 2025
