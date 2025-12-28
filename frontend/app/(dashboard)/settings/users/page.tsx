/**
 * Users Management Page V2
 * Manage user accounts, roles, and permissions
 * Updated with Design System V2
 */

'use client'

import { PageLayout } from '@/components/layouts'
import { UsersList } from '@/components/settings'

export default function UsersPage() {
  return (
    <PageLayout
      title="User Management"
      description="Manage user accounts, roles, and permissions"
      backLink="/settings"
    >
      <UsersList />
    </PageLayout>
  )
}
