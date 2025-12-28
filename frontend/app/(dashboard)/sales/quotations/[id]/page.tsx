'use client'

/**
 * Quotation Detail Page V2
 * View and edit quotation, with win/lose actions for pending quotations
 * Updated with Design System V2
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { LoadingState } from '@/components/patterns'
import { Icon } from '@/components/icons'
import { QuotationForm } from '@/components/sales/quotations/QuotationForm'
import { QuotationWinDialog } from '@/components/sales/quotations/QuotationWinDialog'
import {
  useQuotation,
  useUpdateQuotation,
  useMarkQuotationWon,
  useMarkQuotationLost,
} from '@/hooks/useQuotations'
import { useProductLines } from '@/hooks/useProductLines'
import { useToast } from '@/hooks/use-toast'
import { QuotationStatus } from '@/types/sales'
import { formatCurrency, formatDate } from '@/lib/utils'

interface QuotationDetailPageProps {
  params: {
    id: string
  }
}

export default function QuotationDetailPage({ params }: QuotationDetailPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { quotation, isLoading } = useQuotation(params.id)
  const { updateQuotation } = useUpdateQuotation()
  const { markWon } = useMarkQuotationWon()
  const { markLost } = useMarkQuotationLost()
  const { productLines } = useProductLines()

  const [isEditing, setIsEditing] = useState(false)
  const [winDialogOpen, setWinDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUpdate = async (data: any) => {
    try {
      setIsSubmitting(true)
      await updateQuotation(params.id, data)
      toast({
        title: 'Success',
        description: 'Quotation updated successfully',
      })
      setIsEditing(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update quotation',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkWon = () => {
    setWinDialogOpen(true)
  }

  const handleWinSubmit = async (data: any) => {
    try {
      setIsSubmitting(true)
      const result = await markWon(params.id, data)
      toast({
        title: 'Success',
        description: 'Quotation marked as won and sales control created',
      })
      setWinDialogOpen(false)
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

  const handleMarkLost = async () => {
    const reason = prompt('Please enter the reason for losing this quotation:')
    if (!reason) return

    try {
      await markLost(params.id, {
        lost_date: new Date().toISOString().split('T')[0],
        lost_reason: reason,
      })
      toast({
        title: 'Success',
        description: 'Quotation marked as lost',
      })
      router.push('/sales/quotations')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to mark quotation as lost',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <PageLayout title="Quotation Details" description="Loading...">
        <LoadingState message="Loading quotation..." />
      </PageLayout>
    )
  }

  if (!quotation) {
    return (
      <PageLayout title="Quotation Details" description="Not found">
        <div className="text-center py-12">
          <Icon name="error" className="h-12 w-12 text-error mx-auto mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">Quotation not found</p>
        </div>
      </PageLayout>
    )
  }

  const isPending = quotation.status === QuotationStatus.PENDING

  return (
    <PageLayout
      title={quotation.quotation_number}
      description={quotation.client_name}
      breadcrumbs={[
        { label: 'Ventas', href: '/sales' },
        { label: 'Quotations', href: '/sales/quotations' },
        { label: quotation.quotation_number }
      ]}
      actions={
        isPending && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleMarkWon}
              className="bg-success hover:bg-success/90"
              leftIcon={<Icon name="check_circle" size="sm" />}
            >
              Mark as Won
            </Button>
            <Button
              onClick={handleMarkLost}
              variant="destructive"
              leftIcon={<Icon name="cancel" size="sm" />}
            >
              Mark as Lost
            </Button>
          </div>
        )
      }
    >
      {/* Quotation Details */}
      {!isEditing ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quotation Details</CardTitle>
              <Button onClick={() => setIsEditing(true)} variant="outline" leftIcon={<Icon name="edit" size="sm" />}>
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Quotation Number
                </p>
                <p className="text-base font-semibold">
                  {quotation.quotation_number}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Quotation Date
                </p>
                <p className="text-base font-semibold">
                  {formatDate(quotation.quotation_date)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Client</p>
                <p className="text-base font-semibold">{quotation.client_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Total Amount
                </p>
                <p className="text-base font-semibold">
                  {formatCurrency(
                    quotation.total_amount,
                    quotation.currency || 'COP'
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Status</p>
                <p className="text-base font-semibold capitalize">
                  {quotation.status}
                </p>
              </div>
              {quotation.validity_days && (
                <div>
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    Validity
                  </p>
                  <p className="text-base font-semibold">
                    {quotation.validity_days} days
                  </p>
                </div>
              )}
            </div>
            {quotation.notes && (
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                  Notes
                </p>
                <p className="text-base text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                  {quotation.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Edit Quotation</CardTitle>
          </CardHeader>
          <CardContent>
            <QuotationForm
              quotation={quotation}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isLoading={isSubmitting}
            />
          </CardContent>
        </Card>
      )}

      {/* Win Dialog */}
      <QuotationWinDialog
        open={winDialogOpen}
        onOpenChange={setWinDialogOpen}
        quotationAmount={quotation.total_amount}
        onSubmit={handleWinSubmit}
        productLines={productLines}
        isLoading={isSubmitting}
      />
    </PageLayout>
  )
}
