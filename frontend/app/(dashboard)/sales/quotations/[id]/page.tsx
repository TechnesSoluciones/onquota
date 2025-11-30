'use client'

/**
 * Quotation Detail Page
 * View and edit quotation, with win/lose actions for pending quotations
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react'
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Quotation not found</p>
      </div>
    )
  }

  const isPending = quotation.status === QuotationStatus.PENDING

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/sales/quotations')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Quotations
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {quotation.quotation_number}
          </h1>
          <p className="text-muted-foreground">{quotation.client_name}</p>
        </div>
        <div className="flex items-center gap-3">
          {isPending && (
            <>
              <Button
                onClick={handleMarkWon}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Won
              </Button>
              <Button
                onClick={handleMarkLost}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Mark as Lost
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quotation Details */}
      {!isEditing ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quotation Details</CardTitle>
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Quotation Number
                </p>
                <p className="text-base font-semibold">
                  {quotation.quotation_number}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Quotation Date
                </p>
                <p className="text-base font-semibold">
                  {formatDate(quotation.quotation_date)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client</p>
                <p className="text-base font-semibold">{quotation.client_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
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
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-base font-semibold capitalize">
                  {quotation.status}
                </p>
              </div>
              {quotation.validity_days && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
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
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Notes
                </p>
                <p className="text-base text-slate-700 whitespace-pre-wrap">
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
    </div>
  )
}
