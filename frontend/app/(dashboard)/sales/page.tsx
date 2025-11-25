'use client'

import { useState } from 'react'
import { useSales } from '@/hooks/useSales'
import { SaleFilters } from '@/components/sales/SaleFilters'
import { CreateSaleModal } from '@/components/sales/CreateSaleModal'
import { EditSaleModal } from '@/components/sales/EditSaleModal'
import { StatusBadge } from '@/components/sales/StatusBadge'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, AlertCircle, Edit, Eye } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SaleStatus, type Quote } from '@/types/quote'
import Link from 'next/link'

/**
 * Sales/Quotes list page
 * Displays all quotes with filters, pagination, and CRUD operations
 */
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ventas / Cotizaciones</h1>
          <p className="text-muted-foreground">
            Gestiona tus cotizaciones y ventas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/sales/stats">
              <Eye className="h-4 w-4 mr-2" />
              Ver Estadísticas
            </Link>
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cotización
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <SaleFilters
        filters={filters}
        onFilterChange={updateFilters}
        onClear={clearFilters}
      />

      {/* Lista de Cotizaciones */}
      <div className="bg-white rounded-lg shadow">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">
                Error al cargar cotizaciones
              </p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No se encontraron cotizaciones
            </p>
            {Object.keys(filters).length > 0 && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      # Cotización
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Válida Hasta
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {quotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-blue-600">
                        <Link
                          href={`/sales/${quote.id}`}
                          className="hover:underline"
                        >
                          {quote.quote_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-slate-900">
                          Cliente ID: {quote.client_id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(quote.valid_until)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                        {formatCurrency(
                          Number(quote.total_amount),
                          quote.currency
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={quote.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2 flex justify-end">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/sales/${quote.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
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
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Mostrando{' '}
                {quotes.length === 0
                  ? 0
                  : (pagination.page - 1) * pagination.page_size + 1}{' '}
                a {Math.min(pagination.page * pagination.page_size, pagination.total)}{' '}
                de {pagination.total} cotizaciones
              </div>
              {pagination.pages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm whitespace-nowrap">
                    Página {pagination.page} de {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
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
    </div>
  )
}
