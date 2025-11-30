'use client'

/**
 * Sales Control Detail Page
 * View sales control details and manage lifecycle
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SalesControlDetail } from '@/components/sales/controls/SalesControlDetail'
import {
  useSalesControl,
  useMarkInProduction,
  useMarkDelivered,
  useMarkInvoiced,
  useMarkPaid,
  useCancelSalesControl,
} from '@/hooks/useSalesControls'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SalesControlDetailPageProps {
  params: {
    id: string
  }
}

export default function SalesControlDetailPage({
  params,
}: SalesControlDetailPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { salesControl, isLoading } = useSalesControl(params.id)
  const { markInProduction } = useMarkInProduction()
  const { markDelivered } = useMarkDelivered()
  const { markInvoiced } = useMarkInvoiced()
  const { markPaid } = useMarkPaid()
  const { cancelSalesControl } = useCancelSalesControl()

  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [cancelReason, setCancelReason] = useState('')

  const handleMarkInProduction = async () => {
    try {
      await markInProduction(params.id)
      toast({
        title: 'Success',
        description: 'Marked as in production',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  const handleMarkDelivered = async () => {
    try {
      await markDelivered(params.id, { actual_delivery_date: deliveryDate })
      toast({
        title: 'Success',
        description: 'Marked as delivered',
      })
      setDeliveryDialogOpen(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to mark as delivered',
        variant: 'destructive',
      })
    }
  }

  const handleMarkInvoiced = async () => {
    if (!invoiceNumber) {
      toast({
        title: 'Error',
        description: 'Invoice number is required',
        variant: 'destructive',
      })
      return
    }

    try {
      await markInvoiced(params.id, {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
      })
      toast({
        title: 'Success',
        description: 'Marked as invoiced',
      })
      setInvoiceDialogOpen(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to mark as invoiced',
        variant: 'destructive',
      })
    }
  }

  const handleMarkPaid = async () => {
    try {
      await markPaid(params.id, { payment_date: paymentDate })
      toast({
        title: 'Success',
        description: 'Marked as paid',
      })
      setPaymentDialogOpen(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to mark as paid',
        variant: 'destructive',
      })
    }
  }

  const handleCancel = async () => {
    if (!cancelReason) {
      toast({
        title: 'Error',
        description: 'Cancel reason is required',
        variant: 'destructive',
      })
      return
    }

    try {
      await cancelSalesControl(params.id, { reason: cancelReason })
      toast({
        title: 'Success',
        description: 'Sales control cancelled',
      })
      setCancelDialogOpen(false)
      router.push('/sales/controls')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to cancel sales control',
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

  if (!salesControl) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sales control not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/sales/controls')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Sales Controls
      </Button>

      {/* Detail Component */}
      <SalesControlDetail
        salesControl={salesControl}
        onMarkInProduction={handleMarkInProduction}
        onMarkDelivered={() => setDeliveryDialogOpen(true)}
        onMarkInvoiced={() => setInvoiceDialogOpen(true)}
        onMarkPaid={() => setPaymentDialogOpen(true)}
        onCancel={() => setCancelDialogOpen(true)}
      />

      {/* Delivery Dialog */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Delivered</DialogTitle>
            <DialogDescription>
              Enter the actual delivery date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_date">Delivery Date</Label>
              <Input
                id="delivery_date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkDelivered}>Confirm Delivery</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Invoiced</DialogTitle>
            <DialogDescription>
              Enter the invoice details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Invoice Number *</Label>
              <Input
                id="invoice_number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date</Label>
              <Input
                id="invoice_date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkInvoiced}>Confirm Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            <DialogDescription>
              Enter the payment date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkPaid}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Sales Control</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancellation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel_reason">Reason *</Label>
              <Input
                id="cancel_reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Client cancelled the order"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Back
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
