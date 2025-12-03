/**
 * Users Management Page
 * Manage user accounts, roles, and permissions
 */

'use client'

import { UsersList } from '@/components/settings'

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">
          Manage user accounts, roles, and permissions
        </p>
      </div>

      <UsersList />
    </div>
  )
}
