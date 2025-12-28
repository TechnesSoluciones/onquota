'use client'

/**
 * Sales/Quotes List Page V2
 * Displays all quotes with filters, pagination, and CRUD operations
 * Updated with Design System V2
 */

import { useState } from 'react'
import Link from 'next/link'
import { useSales } from '@/hooks/useSales'
import { SaleFilters } from '@/components/sales/SaleFilters'
import { CreateSaleModal } from '@/components/sales/CreateSaleModal'
import { EditSaleModal } from '@/components/sales/EditSaleModal'
import { StatusBadge } from '@/components/sales/StatusBadge'
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { LoadingState, EmptyState } from '@/components/patterns'
import { Icon } from '@/components/icons'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SaleStatus, type Quote } from '@/types/quote'

export default function SalesPage() {
  const {
    quotes,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
  } = useSales()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)

  return (
    <PageLayout
      title="Ventas / Cotizaciones"
      description="Gestiona tus cotizaciones y ventas"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/sales/stats">
              <Icon name="assessment" size="sm" className="mr-2" />
              Ver Estadísticas
            </Link>
          </Button>
          <Button onClick={() => setCreateModalOpen(true)} leftIcon={<Icon name="add" />}>
            Nueva Cotización
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filtros */}
        <SaleFilters
          filters={filters}
          onFilterChange={updateFilters}
          onClear={clearFilters}
        />

        {/* Error State */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/20">
            <Icon name="error" className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-error">Error al cargar cotizaciones</p>
              <p className="text-sm text-error/80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <LoadingState message="Cargando cotizaciones..." />
        ) : quotes.length === 0 ? (
          /* Empty State */
          <EmptyState
            icon="description"
            title="No hay cotizaciones"
            description={
              Object.keys(filters).length > 0
                ? 'No se encontraron cotizaciones con los filtros aplicados'
                : 'Comienza creando tu primera cotización'
            }
            action={
              Object.keys(filters).length > 0
                ? { label: 'Limpiar filtros', onClick: clearFilters }
                : { label: 'Nueva Cotización', onClick: () => setCreateModalOpen(true) }
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead># Cotización</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Válida Hasta</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>
                      <Link
                        href={`/sales/${quote.id}`}
                        className="font-mono font-medium text-primary hover:underline"
                      >
                        {quote.quote_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-neutral-900 dark:text-white">
                        Cliente ID: {quote.client_id.substring(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-600 dark:text-neutral-400">
                      {formatDate(quote.valid_until)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-neutral-900 dark:text-white">
                      {formatCurrency(Number(quote.total_amount), quote.currency)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={quote.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/sales/${quote.id}`}>
                            <Icon name="visibility" size="sm" className="mr-2" />
                            Ver
                          </Link>
                        </Button>
                        {quote.status === SaleStatus.DRAFT && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedQuoteId(quote.id)
                              setEditModalOpen(true)
                            }}
                          >
                            <Icon name="edit" size="sm" className="mr-2" />
                            Editar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginación */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Mostrando{' '}
                {quotes.length === 0 ? 0 : (pagination.page - 1) * pagination.page_size + 1} a{' '}
                {Math.min(pagination.page * pagination.page_size, pagination.total)} de{' '}
                {pagination.total} cotizaciones
              </div>
              {pagination.pages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    leftIcon={<Icon name="chevron_left" size="sm" />}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                    Página {pagination.page} de {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    rightIcon={<Icon name="chevron_right" size="sm" />}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Quote Modal */}
      <CreateSaleModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => refresh()}
      />

      {/* Edit Quote Modal */}
      <EditSaleModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        quoteId={selectedQuoteId}
        onSuccess={() => {
          refresh()
          setSelectedQuoteId(null)
        }}
      />
    </PageLayout>
  )
}
