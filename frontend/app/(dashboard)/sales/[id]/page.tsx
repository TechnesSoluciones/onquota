'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { salesApi } from '@/lib/api/sales'
import type { QuoteWithItems } from '@/types/quote'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/sales/StatusBadge'
import { QuoteItemsTable, type QuoteItemRow } from '@/components/sales/QuoteItemsTable'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { SaleStatus } from '@/types/quote'
import {
  Loader2,
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  FileText,
  User,
  Send,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

/**
 * Quote detail page
 * Displays full quote information including items, client, and status
 */
export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()

  const [quote, setQuote] = useState<QuoteWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const loadQuote = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await salesApi.getQuote(params.id as string)
      setQuote(data)
    } catch (err: any) {
      setError(err?.detail || 'Error al cargar la cotización')
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadQuote()
  }, [loadQuote])

  const handleDelete = async () => {
    if (
      !confirm(
        '¿Estás seguro de eliminar esta cotización? Esta acción no se puede deshacer.'
      )
    ) {
      return
    }

    try {
      setIsDeleting(true)
      await salesApi.deleteQuote(params.id as string)
      toast({
        title: 'Éxito',
        description: 'Cotización eliminada correctamente',
      })
      router.push('/sales')
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.detail || 'Error al eliminar la cotización',
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  const handleUpdateStatus = async (newStatus: SaleStatus) => {
    if (!quote) return

    const confirmMessage = {
      [SaleStatus.SENT]: '¿Deseas marcar esta cotización como ENVIADA?',
      [SaleStatus.ACCEPTED]: '¿Deseas marcar esta cotización como ACEPTADA?',
      [SaleStatus.REJECTED]: '¿Deseas marcar esta cotización como RECHAZADA?',
      [SaleStatus.EXPIRED]: '¿Deseas marcar esta cotización como EXPIRADA?',
    }[newStatus]

    if (!confirm(confirmMessage)) return

    try {
      setIsUpdatingStatus(true)
      await salesApi.updateQuoteStatus(quote.id, newStatus)
      toast({
        title: 'Éxito',
        description: 'Estado actualizado correctamente',
      })
      await loadQuote()
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.detail || 'Error al actualizar el estado',
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Cotización no encontrada'}</p>
        <Button asChild>
          <Link href="/sales">Volver a Ventas</Link>
        </Button>
      </div>
    )
  }

  const amountNumber =
    typeof quote.total_amount === 'string'
      ? parseFloat(quote.total_amount)
      : quote.total_amount

  // Convert items to QuoteItemRow format for the table
  const itemsForTable: QuoteItemRow[] = quote.items.map((item) => ({
    id: item.id,
    product_name: item.product_name,
    description: item.description || '',
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_percent: item.discount_percent,
    subtotal: item.subtotal,
  }))

  // Determine available status transitions
  const canMarkAsSent = quote.status === SaleStatus.DRAFT
  const canMarkAsAccepted = quote.status === SaleStatus.SENT
  const canMarkAsRejected = quote.status === SaleStatus.SENT
  const canEdit = quote.status === SaleStatus.DRAFT

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sales">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalle de Cotización</h1>
            <p className="text-muted-foreground font-mono">{quote.quote_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/sales?edit=${quote.id}`}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Información Principal */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Cotización</CardTitle>
                <p className="text-muted-foreground mt-1 font-mono">
                  {quote.quote_number}
                </p>
              </div>
              <StatusBadge status={quote.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Monto Total */}
            <div>
              <p className="text-sm text-muted-foreground">Monto Total</p>
              <p className="text-4xl font-bold">
                {formatCurrency(amountNumber, quote.currency)}
              </p>
            </div>

            <Separator />

            {/* Detalles */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium text-sm font-mono">
                    {quote.client_id.substring(0, 8)}...
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Válida Hasta</p>
                  <p className="font-medium">{formatDate(quote.valid_until)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Representante de Ventas</p>
                  <p className="font-medium text-sm font-mono">
                    {quote.sales_rep_id.substring(0, 8)}...
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Items de la Cotización */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Items de la Cotización</h3>
              <QuoteItemsTable
                items={itemsForTable}
                onChange={() => {}}
                currency={quote.currency}
                readOnly={true}
              />
            </div>

            {/* Notas */}
            {quote.notes && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Notas</p>
                    <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          {(canMarkAsSent || canMarkAsAccepted || canMarkAsRejected) && (
            <Card>
              <CardHeader>
                <CardTitle>Acciones de Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {canMarkAsSent && (
                  <Button
                    className="w-full"
                    onClick={() => handleUpdateStatus(SaleStatus.SENT)}
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    <Send className="h-4 w-4 mr-2" />
                    Marcar como Enviada
                  </Button>
                )}
                {canMarkAsAccepted && (
                  <Button
                    className="w-full"
                    variant="default"
                    onClick={() => handleUpdateStatus(SaleStatus.ACCEPTED)}
                    disabled={isUpdatingStatus}
                  >
                    Marcar como Aceptada
                  </Button>
                )}
                {canMarkAsRejected && (
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={() => handleUpdateStatus(SaleStatus.REJECTED)}
                    disabled={isUpdatingStatus}
                  >
                    Marcar como Rechazada
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Creado</p>
                <p className="text-sm">{formatDateTime(quote.created_at)}</p>
              </div>
              {quote.updated_at && (
                <div>
                  <p className="text-muted-foreground">Actualizado</p>
                  <p className="text-sm">{formatDateTime(quote.updated_at)}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">ID de la Cotización</p>
                <p className="font-mono text-xs break-all">{quote.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tenant ID</p>
                <p className="font-mono text-xs break-all">{quote.tenant_id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
