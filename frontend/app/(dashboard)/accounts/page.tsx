'use client'

/**
 * Account Plans Page V2
 * Strategic account plans management and tracking
 * Updated with Design System V2
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { Icon } from '@/components/icons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlanList } from '@/components/accounts/PlanList'
import { useAccountPlans } from '@/hooks/useAccountPlans'
import { useRole } from '@/hooks/useRole'
import { PlanStatus } from '@/types/accounts'

export default function AccountPlansPage() {
  const router = useRouter()
  const { plans, isLoading, updateFilters, goToPage, pagination } =
    useAccountPlans()
  const { canCreate } = useRole()
  const [activeTab, setActiveTab] = useState<string>('all')

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === 'all') {
      updateFilters({ status: undefined })
    } else {
      updateFilters({ status: value as PlanStatus })
    }
  }

  const handleSearch = (query: string) => {
    updateFilters({ search: query })
  }

  const handleFilterStatus = (status: PlanStatus | 'all') => {
    if (status === 'all') {
      updateFilters({ status: undefined })
    } else {
      updateFilters({ status })
    }
  }

  const handlePageChange = (page: number) => {
    goToPage(page)
  }

  return (
    <PageLayout
      title="Account Plans"
      description="Manage strategic account plans and track progress"
      actions={
        canCreate() ? (
          <Button onClick={() => router.push('/accounts/new')} leftIcon={<Icon name="add" />}>
            New Plan
          </Button>
        ) : undefined
      }
    >
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All Plans</TabsTrigger>
          <TabsTrigger value={PlanStatus.ACTIVE}>Active</TabsTrigger>
          <TabsTrigger value={PlanStatus.DRAFT}>Draft</TabsTrigger>
          <TabsTrigger value={PlanStatus.COMPLETED}>Completed</TabsTrigger>
          <TabsTrigger value={PlanStatus.CANCELLED}>Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <PlanList
            plans={plans}
            isLoading={isLoading}
            onSearch={handleSearch}
            onFilterStatus={handleFilterStatus}
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={handlePageChange}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
