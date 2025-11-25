'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlanList } from '@/components/accounts/PlanList'
import { useAccountPlans } from '@/hooks/useAccountPlans'
import { useRole } from '@/hooks/useRole'
import { PlanStatus } from '@/types/accounts'
import { Plus } from 'lucide-react'

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

  // Get counts for each status
  const getStatusCount = (status?: PlanStatus) => {
    if (!status) {
      return plans.length
    }
    return plans.filter((plan) => plan.status === status).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Plans</h1>
          <p className="text-muted-foreground">
            Manage strategic account plans and track progress
          </p>
        </div>
        {canCreate() && (
          <Button onClick={() => router.push('/accounts/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Plan
          </Button>
        )}
      </div>

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
    </div>
  )
}
