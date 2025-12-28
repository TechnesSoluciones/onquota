'use client'

/**
 * Quotations Page V2
 * Main page for managing quotations with stats and filters
 * Updated with Design System V2
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { LoadingState } from '@/components/patterns'
import { Icon } from '@/components/icons'
import { QuotationList } from '@/components/sales/quotations/QuotationList'
import { QuotationWinDialog } from '@/components/sales/quotations/QuotationWinDialog'
import { useQuotations, useQuotationStats, useMarkQuotationWon, useMarkQuotationLost } from '@/hooks/useQuotations'
import { useProductLines } from '@/hooks/useProductLines'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import type { QuotationListItem } from '@/types/sales'

export default function QuotationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { quotations, isLoading, error } = useQuotations()
  const { stats } = useQuotationStats()
  const { productLines } = useProductLines()
  const { markWon } = useMarkQuotationWon()
  const { markLost } = useMarkQuotationLost()

  const [winDialogOpen, setWinDialogOpen] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationListItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEdit = (quotation: QuotationListItem) => {
    router.push(`/sales/quotations/${quotation.id}`)
  }

  const handleDelete = async (quotation: QuotationListItem) => {
    // Delete functionality would be implemented via hook
    toast({
      title: 'Info',
      description: 'Delete functionality to be implemented',
    })
  }

  const handleMarkWon = (quotation: QuotationListItem) => {
    setSelectedQuotation(quotation)
    setWinDialogOpen(true)
  }

  const handleMarkLost = async (quotation: QuotationListItem) => {
    const reason = prompt('Please enter the reason for losing this quotation:')
    if (!reason) return

    try {
      await markLost(quotation.id, {
        lost_date: new Date().toISOString().split('T')[0],
        lost_reason: reason,
      })
      toast({
        title: 'Success',
        description: 'Quotation marked as lost',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to mark quotation as lost',
        variant: 'destructive',
      })
    }
  }

  const handleWinSubmit = async (data: any) => {
    if (!selectedQuotation) return

    try {
      setIsSubmitting(true)
      const result = await markWon(selectedQuotation.id, data)
      toast({
        title: 'Success',
        description: 'Quotation marked as won and sales control created',
      })
      setWinDialogOpen(false)
      setSelectedQuotation(null)
      // Navigate to sales control detail
      if (result?.sales_control) {
        router.push(`/sales/controls/${result.sales_control.id}`)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to mark quotation as won',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageLayout
      title="Quotations"
      description="Manage your sales quotations and opportunities"
      breadcrumbs={[
        { label: 'Ventas', href: '/sales' },
        { label: 'Quotations' }
      ]}
      actions={
        <Button onClick={() => router.push('/sales/quotations/new')} leftIcon={<Icon name="add" />}>
          New Quotation
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Total Quotations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Icon name="description" className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                  <p className="text-2xl font-bold">{stats.total_quotations}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Win Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Icon name="trending_up" className="h-5 w-5 text-success" />
                  <p className="text-2xl font-bold text-success">
                    {stats.win_rate.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Total Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Icon name="payments" className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.total_quotation_value, 'COP')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Won Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Icon name="payments" className="h-5 w-5 text-success" />
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(stats.total_won_value, 'COP')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/20">
            <Icon name="error" className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-error">Error loading quotations</p>
              <p className="text-sm text-error/80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <LoadingState message="Loading quotations..." />
        ) : (
          <QuotationList
            quotations={quotations}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onMarkWon={handleMarkWon}
            onMarkLost={handleMarkLost}
          />
        )}

        {/* Win Dialog */}
        {selectedQuotation && (
          <QuotationWinDialog
            open={winDialogOpen}
            onOpenChange={setWinDialogOpen}
            quotationAmount={selectedQuotation.total_amount}
            onSubmit={handleWinSubmit}
            productLines={productLines}
            isLoading={isSubmitting}
          />
        )}
      </div>
    </PageLayout>
  )
}
