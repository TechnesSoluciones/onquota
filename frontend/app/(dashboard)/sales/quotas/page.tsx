'use client'

/**
 * Quotas Dashboard Page V2
 * Main page for viewing quota performance and trends
 * Updated with Design System V2
 */

import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { LoadingState } from '@/components/patterns'
import { Icon } from '@/components/icons'
import { QuotaDashboard } from '@/components/sales/quotas/QuotaDashboard'
import { QuotaForm } from '@/components/sales/quotas/QuotaForm'
import {
  useQuotaDashboard,
  useQuotaTrends,
  useQuotaComparison,
  useCreateQuota,
} from '@/hooks/useQuotas'
import { useProductLines } from '@/hooks/useProductLines'
import { useToast } from '@/hooks/use-toast'

// Mock users - in real app, fetch from API
// Using real UUIDs for testing to avoid 422 validation errors
const MOCK_USERS = [
  { id: 'f0a8d086-1ab3-43b6-9f41-51b0feab9bc2', name: 'Jose Gomez' },  // Real user from DB
  { id: '2d75f36e-b8e5-490a-9a48-ad612d45af81', name: 'Test User' },    // Real user from DB
]

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

export default function QuotasPage() {
  const { toast } = useToast()
  const currentDate = new Date()

  const [selectedUserId, setSelectedUserId] = useState<string>(MOCK_USERS[0].id)
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { dashboard, isLoading: dashboardLoading, error: dashboardError } = useQuotaDashboard(
    selectedUserId,
    selectedYear,
    selectedMonth
  )
  const { trends } = useQuotaTrends(selectedUserId, selectedYear)
  const { comparison } = useQuotaComparison(selectedUserId, selectedYear, selectedMonth)
  const { productLines = [] } = useProductLines()
  const { createQuota } = useCreateQuota()

  const handleCreateQuota = async (data: any) => {
    try {
      setIsSubmitting(true)
      await createQuota(data)
      toast({
        title: 'Success',
        description: 'Quota created successfully',
      })
      setCreateModalOpen(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create quota',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generate year options (current year +/- 2 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i)

  return (
    <PageLayout
      title="Sales Quotas"
      description="Track quota achievement and performance trends"
      breadcrumbs={[
        { label: 'Ventas', href: '/sales' },
        { label: 'Quotas' }
      ]}
      actions={
        <Button onClick={() => setCreateModalOpen(true)} leftIcon={<Icon name="add" />}>
          Set New Quota
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon name="calendar_month" className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* User Selection */}
            <div className="space-y-2">
              <Label htmlFor="user">Sales Representative</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger id="user">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_USERS.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Selection */}
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Selection */}
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Error State */}
        {dashboardError && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/20">
            <Icon name="error" className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-error">Error loading quota data</p>
              <p className="text-sm text-error/80">{dashboardError}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {dashboardLoading ? (
          <LoadingState message="Loading quota dashboard..." />
        ) : (
          <QuotaDashboard
            dashboard={dashboard}
            trends={trends}
            comparison={comparison}
            currency="COP"
          />
        )}

      {/* Create Quota Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set New Quota</DialogTitle>
            <DialogDescription>
              Define sales targets for a user with product line breakdown
            </DialogDescription>
          </DialogHeader>
          <QuotaForm
            onSubmit={handleCreateQuota}
            onCancel={() => setCreateModalOpen(false)}
            productLines={productLines}
            users={MOCK_USERS}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
      </div>
    </PageLayout>
  )
}
