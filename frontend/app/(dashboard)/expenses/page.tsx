'use client'

import { useState } from 'react'
import { useExpenses } from '@/hooks/useExpenses'
import { ExpenseFilters } from '@/components/expenses/ExpenseFilters'
import { CreateExpenseModal } from '@/components/expenses/CreateExpenseModal'
import { EditExpenseModal } from '@/components/expenses/EditExpenseModal'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, AlertCircle, Edit } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EXPENSE_STATUS_LABELS, EXPENSE_STATUS_COLORS } from '@/constants/expense-status'
import type { ExpenseWithCategory } from '@/types/expense'

export default function ExpensesPage() {
  const {
    expenses,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
  } = useExpenses()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithCategory | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gastos</h1>
          <p className="text-muted-foreground">
            Gestiona y controla todos tus gastos
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Gasto
        </Button>
      </div>

      {/* Filtros */}
      <ExpenseFilters
        filters={filters}
        onFilterChange={updateFilters}
        onClear={clearFilters}
      />

      {/* Lista de Gastos */}
      <div className="bg-white rounded-lg shadow">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Error al cargar gastos</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No se encontraron gastos</p>
            {Object.keys(filters).length > 0 && (
              <Button
                variant="link"
                onClick={clearFilters}
                className="mt-2"
              >
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
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Categoría
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
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <div className="font-medium text-slate-900">{expense.description}</div>
                          {expense.vendor_name && (
                            <div className="text-muted-foreground text-xs">
                              {expense.vendor_name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {expense.category?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                        {formatCurrency(Number(expense.amount), expense.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={EXPENSE_STATUS_COLORS[expense.status]}
                        >
                          {EXPENSE_STATUS_LABELS[expense.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedExpense(expense)
                            setEditModalOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {expenses.length === 0 ? 0 : (pagination.page - 1) * pagination.page_size + 1} a{' '}
                {Math.min(pagination.page * pagination.page_size, pagination.total)} de{' '}
                {pagination.total} gastos
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

      {/* Create Expense Modal */}
      <CreateExpenseModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => refresh()}
      />

      {/* Edit Expense Modal */}
      <EditExpenseModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        expense={selectedExpense}
        onSuccess={() => {
          refresh()
          setSelectedExpense(null)
        }}
      />
    </div>
  )
}
