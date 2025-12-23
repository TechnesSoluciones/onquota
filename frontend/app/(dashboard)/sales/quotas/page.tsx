'use client'

/**
 * Quotas Dashboard Page
 * Main page for viewing quota performance and trends
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Loader2, AlertCircle, Calendar, User } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sales Quotas</h1>
          <p className="text-muted-foreground">
            Track quota achievement and performance trends
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Set New Quota
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
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
        <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Error loading quota data</p>
            <p className="text-sm text-red-700">{dashboardError}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {dashboardLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
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
  )
}
