'use client'

/**
 * Expense Detail Page V2
 * Displays full expense information with approval workflow
 * Updated with Design System V2
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { expensesApi } from '@/lib/api/expenses'
import type { ExpenseWithCategory } from '@/types/expense'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { LoadingState } from '@/components/patterns'
import { Icon } from '@/components/icons'
import { ApprovalActions } from '@/components/expenses/ApprovalActions'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { EXPENSE_STATUS_LABELS, EXPENSE_STATUS_COLORS } from '@/constants/expense-status'
import { useRole } from '@/hooks/useRole'
import { useToast } from '@/hooks/use-toast'

export default function ExpenseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { canApproveExpenses } = useRole()

  const [expense, setExpense] = useState<ExpenseWithCategory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadExpense = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await expensesApi.getExpense(params.id as string)
      setExpense(data)
    } catch (err: any) {
      setError(err?.detail || 'Error al cargar el gasto')
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    loadExpense()
  }, [loadExpense])

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      setIsDeleting(true)
      await expensesApi.deleteExpense(params.id as string)
      toast({
        title: 'Éxito',
        description: 'Gasto eliminado correctamente',
      })
      router.push('/expenses')
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.detail || 'Error al eliminar el gasto',
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <PageLayout title="Detalle del Gasto" description="Cargando información...">
        <LoadingState message="Cargando información del gasto..." />
      </PageLayout>
    )
  }

  if (error || !expense) {
    return (
      <PageLayout title="Detalle del Gasto" description="Error al cargar">
        <div className="text-center py-12">
          <Icon name="error_outline" className="h-16 w-16 mx-auto text-error mb-4" />
          <p className="text-error mb-4">{error || 'Gasto no encontrado'}</p>
          <Button asChild>
            <Link href="/expenses">Volver a Gastos</Link>
          </Button>
        </div>
      </PageLayout>
    )
  }

  const amountNumber = typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount

  return (
    <PageLayout
      title="Detalle del Gasto"
      description={`ID: ${expense.id.slice(0, 8)}`}
      backLink="/expenses"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/expenses/${expense.id}/edit`}>
              <Icon name="edit" className="mr-2" />
              Editar
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            leftIcon={isDeleting ? <Icon name="progress_activity" className="animate-spin" /> : <Icon name="delete" />}
          >
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
                <CardTitle className="text-2xl">{expense.description}</CardTitle>
                <p className="text-muted-foreground mt-1">{expense.vendor_name || 'Sin proveedor'}</p>
              </div>
              <Badge className={EXPENSE_STATUS_COLORS[expense.status]}>
                {EXPENSE_STATUS_LABELS[expense.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Monto */}
            <div>
              <p className="text-sm text-muted-foreground">Monto</p>
              <p className="text-4xl font-bold">
                {formatCurrency(amountNumber, expense.currency)}
              </p>
            </div>

            <Separator />

            {/* Detalles */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Icon name="event" className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Fecha del Gasto</p>
                  <p className="font-medium">{formatDate(expense.date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Icon name="category" className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Categoría</p>
                  <p className="font-medium">{expense.category?.name || 'Sin categoría'}</p>
                </div>
              </div>

              {expense.receipt_number && (
                <div className="flex items-start gap-3">
                  <Icon name="receipt_long" className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Número de Recibo</p>
                    <p className="font-medium">{expense.receipt_number}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Información del Usuario */}
            <div className="flex items-start gap-3 pt-2">
              <Icon name="person" className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">ID de Usuario</p>
                <p className="font-medium font-mono text-sm">{expense.user_id.slice(0, 8)}</p>
              </div>
            </div>

            {/* Notas */}
            {expense.notes && (
              <>
                <div className="border-t my-4" />
                <div className="flex items-start gap-3">
                  <Icon name="note" className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Notas</p>
                    <p className="text-sm whitespace-pre-wrap">{expense.notes}</p>
                  </div>
                </div>
              </>
            )}

            {/* Razón de Rechazo */}
            {expense.status === 'rejected' && expense.rejection_reason && (
              <>
                <div className="border-t my-4" />
                <div className="bg-error/10 border border-error/20 rounded-md p-4 flex items-start gap-3">
                  <Icon name="cancel" className="h-5 w-5 text-error mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-error mb-1">Razón del Rechazo</p>
                    <p className="text-sm text-error/80 whitespace-pre-wrap">{expense.rejection_reason}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Workflow de Aprobación */}
          {canApproveExpenses() && expense.status === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle>Aprobación</CardTitle>
              </CardHeader>
              <CardContent>
                <ApprovalActions expense={expense} onSuccess={loadExpense} />
              </CardContent>
            </Card>
          )}

          {/* Estado de Aprobación */}
          {expense.status === 'approved' && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900">Aprobado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {expense.approved_by && (
                  <div>
                    <p className="text-green-700">Aprobado por</p>
                    <p className="font-medium text-green-900">{expense.approved_by}</p>
                  </div>
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
                <p className="text-sm">{formatDateTime(expense.created_at)}</p>
              </div>
              {expense.updated_at && (
                <div>
                  <p className="text-muted-foreground">Actualizado</p>
                  <p className="text-sm">{formatDateTime(expense.updated_at)}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">ID del Gasto</p>
                <p className="font-mono text-xs break-all">{expense.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}
