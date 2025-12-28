'use client'

/**
 * Expenses List Page V2
 * Displays all expenses with filters, pagination, and CRUD operations
 * Updated with Design System V2
 */

import { useState } from 'react'
import Link from 'next/link'
import { useExpenses } from '@/hooks/useExpenses'
import { ExpenseFilters } from '@/components/expenses/ExpenseFilters'
import { CreateExpenseModal } from '@/components/expenses/CreateExpenseModal'
import { EditExpenseModal } from '@/components/expenses/EditExpenseModal'
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
} from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { LoadingState, EmptyState } from '@/components/patterns'
import { Icon } from '@/components/icons'
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
    <PageLayout
      title="Gastos"
      description="Gestiona y controla todos tus gastos"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/expenses/stats">
              <Icon name="assessment" size="sm" className="mr-2" />
              Ver Estadísticas
            </Link>
          </Button>
          <Button onClick={() => setCreateModalOpen(true)} leftIcon={<Icon name="add" />}>
            Nuevo Gasto
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

      {/* Filtros */}
      <ExpenseFilters
        filters={filters}
        onFilterChange={updateFilters}
        onClear={clearFilters}
      />

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/20">
          <Icon name="error" className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-error">Error al cargar gastos</p>
            <p className="text-sm text-error/80">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <LoadingState message="Cargando gastos..." />
      ) : expenses.length === 0 ? (
        /* Empty State */
        <EmptyState
          icon="receipt_long"
          title="No hay gastos"
          description={
            Object.keys(filters).length > 0
              ? 'No se encontraron gastos con los filtros aplicados'
              : 'Comienza registrando tu primer gasto'
          }
          action={
            Object.keys(filters).length > 0
              ? { label: 'Limpiar filtros', onClick: clearFilters }
              : { label: 'Nuevo Gasto', onClick: () => setCreateModalOpen(true) }
          }
        />
      ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead align="right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead align="right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{expense.description}</div>
                        {expense.vendor_name && (
                          <div className="text-sm text-muted-foreground">
                            {expense.vendor_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{expense.category?.name || '-'}</TableCell>
                    <TableCell align="right" className="font-medium">
                      {formatCurrency(Number(expense.amount), expense.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={EXPENSE_STATUS_COLORS[expense.status]}
                      >
                        {EXPENSE_STATUS_LABELS[expense.status]}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedExpense(expense)
                            setEditModalOpen(true)
                          }}
                          leftIcon={<Icon name="edit" />}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link href={`/expenses/${expense.id}`}>
                            <Icon name="visibility" className="mr-2" />
                            Ver
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginación */}
            {pagination.pages > 1 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {expenses.length === 0 ? 0 : (pagination.page - 1) * pagination.page_size + 1} a{' '}
                  {Math.min(pagination.page * pagination.page_size, pagination.total)} de{' '}
                  {pagination.total} gastos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    leftIcon={<Icon name="chevron_left" />}
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
                    rightIcon={<Icon name="chevron_right" />}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
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
    </PageLayout>
  )
}
