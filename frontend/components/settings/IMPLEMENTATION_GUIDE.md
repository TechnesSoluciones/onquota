# Admin Settings Panel - Implementation Guide

## ✅ Completed (Phases 1-4)

### Backend (100% Complete)
- ✅ SUPER_ADMIN role added to User model
- ✅ AuditLog model created
- ✅ Migration 020 executed successfully
- ✅ Admin schemas created (backend/schemas/admin.py)
- ✅ Admin dependencies and rate limiter updated
- ✅ AdminRepository with full CRUD operations
- ✅ AdminRouter with 11 endpoints registered
- ✅ All endpoints protected with ADMIN/SUPER_ADMIN permissions

### Frontend Types & Hooks (100% Complete)
- ✅ Admin types (frontend/types/admin.ts)
- ✅ UserRole enum updated with SUPER_ADMIN
- ✅ Admin API client (frontend/lib/api/admin.ts)
- ✅ useAdminUsers hook with CRUD operations
- ✅ useAuditLogs hook with filtering
- ✅ useAdminSettings hook with update functionality

## 🔄 Phase 5: UI Components & Pages (In Progress)

### Components to Create

#### 1. UsersList Component
**Location:** `components/settings/UsersList.tsx`
**Purpose:** Display users table with filtering, pagination, and actions
**Features:**
- Table with columns: Name, Email, Role, Status, Last Login, Actions
- Filters: Search, Role filter, Active/Inactive toggle
- Pagination controls
- Actions: Edit, Delete, Toggle Active
- Create new user button

**Dependencies:**
- useAdminUsers hook
- shadcn/ui Table components
- Dialog for create/edit forms

#### 2. UserFormDialog Component
**Location:** `components/settings/UserFormDialog.tsx`
**Purpose:** Modal form for creating/editing users
**Features:**
- Form fields: Email, Password (create only), Full Name, Phone, Role, Active status
- Validation with react-hook-form
- Password strength indicator
- Role selector dropdown
- Active/Inactive toggle

**Form Fields:**
```typescript
{
  email: string (required, email format)
  password: string (required for create, min 8 chars)
  full_name: string (required, min 2 chars)
  phone: string (optional)
  role: UserRole (dropdown)
  is_active: boolean (toggle)
}
```

#### 3. SettingsForm Component
**Location:** `components/settings/SettingsForm.tsx`
**Purpose:** Form for tenant settings
**Features:**
- Company name, domain, logo URL
- Timezone selector
- Date format selector
- Currency selector
- Save button with loading state

**Form Fields:**
```typescript
{
  company_name: string
  domain: string (optional)
  logo_url: string (optional)
  timezone: string (dropdown)
  date_format: string (dropdown: 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD')
  currency: string (dropdown: 'USD', 'EUR', 'MXN', etc.)
}
```

#### 4. AuditLogsTable Component
**Location:** `components/settings/AuditLogsTable.tsx`
**Purpose:** Display audit logs with filtering
**Features:**
- Table with columns: Date, User, Action, Resource, Description, Changes
- Filters: Date range, Action type, Resource type, User
- Pagination
- Expandable rows to show changes JSON
- Color coding by action type

#### 5. StatsCards Component
**Location:** `components/settings/StatsCards.tsx`
**Purpose:** Dashboard statistics cards
**Features:**
- Total Users card
- Active Users card
- Recent Logins card (last 7 days)
- New Users This Month card
- Audit Logs Today card
- Chart showing users by role (pie chart)

### Pages to Create

#### 1. Settings Dashboard
**Location:** `app/(dashboard)/settings/page.tsx`
**URL:** `/settings`
**Content:**
- Welcome message
- Quick stats cards (StatsCards component)
- Quick links to Users, General Settings, Audit Logs
- Recent activity preview (last 5 audit logs)

**Example Structure:**
```tsx
export default function SettingsPage() {
  const { stats, isLoading } = useSystemStats()

  return (
    <div className="space-y-6">
      <div>
        <h1>Settings & Administration</h1>
        <p>Manage users, system settings, and view audit logs</p>
      </div>

      <StatsCards stats={stats} isLoading={isLoading} />

      <div className="grid grid-cols-3 gap-4">
        <QuickLinkCard title="User Management" href="/settings/users" />
        <QuickLinkCard title="General Settings" href="/settings/general" />
        <QuickLinkCard title="Audit Logs" href="/settings/audit-logs" />
      </div>

      <RecentActivityPreview />
    </div>
  )
}
```

#### 2. User Management Page
**Location:** `app/(dashboard)/settings/users/page.tsx`
**URL:** `/settings/users`
**Content:**
- Page title and description
- UsersList component (full width)
- User statistics sidebar (optional)

**Example Structure:**
```tsx
export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1>User Management</h1>
          <p>Manage users, roles, and permissions</p>
        </div>
      </div>

      <UsersList />
    </div>
  )
}
```

#### 3. General Settings Page
**Location:** `app/(dashboard)/settings/general/page.tsx`
**URL:** `/settings/general`
**Content:**
- Page title and description
- SettingsForm component
- Settings info sidebar with current values

**Example Structure:**
```tsx
export default function GeneralSettingsPage() {
  const { settings, isLoading } = useAdminSettings()

  return (
    <div className="space-y-6">
      <div>
        <h1>General Settings</h1>
        <p>Configure tenant settings and preferences</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <SettingsForm settings={settings} />
        </div>
        <div className="col-span-1">
          <SettingsInfoSidebar settings={settings} />
        </div>
      </div>
    </div>
  )
}
```

#### 4. Audit Logs Page
**Location:** `app/(dashboard)/settings/audit-logs/page.tsx`
**URL:** `/settings/audit-logs`
**Content:**
- Page title and description
- AuditLogsTable component
- Filters sidebar

**Example Structure:**
```tsx
export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Audit Logs</h1>
        <p>View system activity and changes</p>
      </div>

      <AuditLogsTable />
    </div>
  )
}
```

## Navigation Menu Integration

Add to `components/layout/Sidebar.tsx`:

```tsx
{user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN ? (
  <SidebarMenuItem>
    <Settings className="w-4 h-4" />
    <span>Settings</span>
    <ChevronDown className="ml-auto h-4 w-4" />
  </SidebarMenuItem>
  <SidebarSubmenu>
    <SidebarSubMenuItem href="/settings">
      Dashboard
    </SidebarSubMenuItem>
    <SidebarSubMenuItem href="/settings/users">
      Users
    </SidebarSubMenuItem>
    <SidebarSubMenuItem href="/settings/general">
      General
    </SidebarSubMenuItem>
    <SidebarSubMenuItem href="/settings/audit-logs">
      Audit Logs
    </SidebarSubMenuItem>
  </SidebarSubmenu>
) : null}
```

## Permission Checks

All settings pages should check for admin permissions:

```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types/auth'
import { redirect } from 'next/navigation'

export default function SettingsLayout({ children }: { children: React.Node }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
    redirect('/dashboard')
  }

  return <div>{children}</div>
}
```

## Styling Guidelines

Use consistent styling with existing components:
- Use shadcn/ui components (Table, Dialog, Form, Card, etc.)
- Follow Tailwind CSS utility classes
- Use existing color scheme and spacing
- Implement responsive design (mobile-first)
- Add loading states and error handling
- Include success/error toast notifications

## Testing Checklist

- [ ] User can view users list
- [ ] User can create new user
- [ ] User can edit existing user
- [ ] User can delete user (with confirmation)
- [ ] User can filter and search users
- [ ] User can update tenant settings
- [ ] User can view audit logs
- [ ] User can filter audit logs by date/action/user
- [ ] Permission checks work correctly
- [ ] Forms validate correctly
- [ ] Error messages display properly
- [ ] Loading states work correctly
- [ ] Success messages show after actions

## API Endpoints Available

All endpoints are at `/api/v1/admin/*`:

### User Management
- `GET /admin/users` - List users
- `GET /admin/users/{id}` - Get user
- `POST /admin/users` - Create user
- `PUT /admin/users/{id}` - Update user
- `DELETE /admin/users/{id}` - Delete user
- `GET /admin/users/stats` - User statistics

### Audit Logs
- `GET /admin/audit-logs` - List logs
- `GET /admin/audit-logs/stats` - Log statistics

### Settings
- `GET /admin/settings` - Get settings
- `PUT /admin/settings` - Update settings

### Statistics
- `GET /admin/stats` - System stats

## Next Steps

1. Create UsersList component
2. Create UserFormDialog component
3. Create settings pages
4. Add navigation menu item
5. Add permission checks to layout
6. Test all functionality
7. Add error handling and loading states
8. Add toast notifications
