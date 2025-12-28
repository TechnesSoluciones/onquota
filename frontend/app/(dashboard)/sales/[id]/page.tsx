'use client'

/**
 * Quote Detail Page V2
 * Displays full quote information including items, client, and status
 * Updated with Design System V2
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { salesApi } from '@/lib/api/sales'
import type { QuoteWithItems } from '@/types/quote'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { LoadingState } from '@/components/patterns'
import { Icon } from '@/components/icons'
import { StatusBadge } from '@/components/sales/StatusBadge'
import { QuoteItemsTable, type QuoteItemRow } from '@/components/sales/QuoteItemsTable'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { SaleStatus } from '@/types/quote'
import { useToast } from '@/hooks/use-toast'

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
      <PageLayout title="Detalle de Cotización" description="Cargando información...">
        <LoadingState message="Cargando información de la cotización..." />
      </PageLayout>
    )
  }

  if (error || !quote) {
    return (
      <PageLayout title="Detalle de Cotización" description="Error al cargar">
        <div className="text-center py-12">
          <Icon name="error" className="h-12 w-12 text-error mx-auto mb-4" />
          <p className="text-error mb-4">{error || 'Cotización no encontrada'}</p>
          <Button asChild>
            <Link href="/sales">Volver a Ventas</Link>
          </Button>
        </div>
      </PageLayout>
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
    <PageLayout
      title="Detalle de Cotización"
      description={quote.quote_number}
      breadcrumbs={[
        { label: 'Ventas', href: '/sales' },
        { label: quote.quote_number }
      ]}
      actions={
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/sales?edit=${quote.id}`}>
                <Icon name="edit" size="sm" className="mr-2" />
                Editar
              </Link>
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            <Icon name="delete" size="sm" className="mr-2" />
            Eliminar
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-3">
        {/* Información Principal */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Cotización</CardTitle>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1 font-mono">
                  {quote.quote_number}
                </p>
              </div>
              <StatusBadge status={quote.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Monto Total */}
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Monto Total</p>
              <p className="text-4xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(amountNumber, quote.currency)}
              </p>
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-800" />

            {/* Detalles */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Icon name="person" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Cliente</p>
                  <p className="font-medium text-sm font-mono">
                    {quote.client_id.substring(0, 8)}...
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Icon name="event" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Válida Hasta</p>
                  <p className="font-medium">{formatDate(quote.valid_until)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Icon name="badge" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Representante de Ventas</p>
                  <p className="font-medium text-sm font-mono">
                    {quote.sales_rep_id.substring(0, 8)}...
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-800" />

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
                <div className="border-t border-neutral-200 dark:border-neutral-800" />
                <div className="flex items-start gap-3">
                  <Icon name="description" className="h-5 w-5 text-neutral-500 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Notas</p>
                    <p className="text-sm whitespace-pre-wrap text-neutral-600 dark:text-neutral-400">{quote.notes}</p>
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
                    isLoading={isUpdatingStatus}
                    leftIcon={<Icon name="send" size="sm" />}
                  >
                    Marcar como Enviada
                  </Button>
                )}
                {canMarkAsAccepted && (
                  <Button
                    className="w-full"
                    variant="default"
                    onClick={() => handleUpdateStatus(SaleStatus.ACCEPTED)}
                    isLoading={isUpdatingStatus}
                    leftIcon={<Icon name="check_circle" size="sm" />}
                  >
                    Marcar como Aceptada
                  </Button>
                )}
                {canMarkAsRejected && (
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={() => handleUpdateStatus(SaleStatus.REJECTED)}
                    isLoading={isUpdatingStatus}
                    leftIcon={<Icon name="cancel" size="sm" />}
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
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">Creado</p>
                <p className="font-medium">{formatDateTime(quote.created_at)}</p>
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-800" />
              {quote.updated_at && (
                <>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Actualizado</p>
                    <p className="font-medium">{formatDateTime(quote.updated_at)}</p>
                  </div>
                  <div className="border-t border-neutral-200 dark:border-neutral-800" />
                </>
              )}
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">ID de la Cotización</p>
                <p className="font-mono text-xs break-all">{quote.id}</p>
              </div>
              <div className="border-t border-neutral-200 dark:border-neutral-800" />
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">Tenant ID</p>
                <p className="font-mono text-xs break-all">{quote.tenant_id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}
