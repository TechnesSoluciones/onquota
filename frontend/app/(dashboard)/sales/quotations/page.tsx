'use client'

/**
 * Quotations Page
 * Main page for managing quotations with stats and filters
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Loader2, AlertCircle, DollarSign, TrendingUp, FileText } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quotations</h1>
          <p className="text-muted-foreground">
            Manage your sales quotations and opportunities
          </p>
        </div>
        <Button onClick={() => router.push('/sales/quotations/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Quotation
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Quotations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold">{stats.total_quotations}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <p className="text-2xl font-bold text-green-600">
                  {stats.win_rate.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.total_quotation_value, 'COP')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Won Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.total_won_value, 'COP')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Error loading quotations</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
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
  )
}
