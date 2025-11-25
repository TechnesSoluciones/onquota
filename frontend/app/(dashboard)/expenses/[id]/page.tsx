'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { expensesApi } from '@/lib/api/expenses'
import type { ExpenseWithCategory } from '@/types/expense'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ApprovalActions } from '@/components/expenses/ApprovalActions'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { EXPENSE_STATUS_LABELS, EXPENSE_STATUS_COLORS } from '@/constants/expense-status'
import { useRole } from '@/hooks/useRole'
import { Loader2, ArrowLeft, Edit, Trash2, Receipt, User, Calendar, CreditCard, FileText, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function ExpenseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { canApproveExpenses } = useRole()

  const [expense, setExpense] = useState<ExpenseWithCategory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadExpense = async () => {
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
  }

  useEffect(() => {
    loadExpense()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      setIsDeleting(true)
      await expensesApi.deleteExpense(params.id as string)
      router.push('/expenses')
    } catch (err: any) {
      alert(err?.detail || 'Error al eliminar el gasto')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !expense) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Gasto no encontrado'}</p>
        <Button asChild>
          <Link href="/expenses">Volver a Gastos</Link>
        </Button>
      </div>
    )
  }

  const amountNumber = typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/expenses">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalle del Gasto</h1>
            <p className="text-muted-foreground">ID: {expense.id.slice(0, 8)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/expenses/${expense.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
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
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Fecha del Gasto</p>
                  <p className="font-medium">{formatDate(expense.date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Receipt className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Categoría</p>
                  <p className="font-medium">{expense.category?.name || 'Sin categoría'}</p>
                </div>
              </div>

              {expense.receipt_number && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Número de Recibo</p>
                    <p className="font-medium">{expense.receipt_number}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Información del Usuario */}
            <div className="flex items-start gap-3 pt-2">
              <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">ID de Usuario</p>
                <p className="font-medium font-mono text-sm">{expense.user_id.slice(0, 8)}</p>
              </div>
            </div>

            {/* Notas */}
            {expense.notes && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
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
                <Separator />
                <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 mb-1">Razón del Rechazo</p>
                    <p className="text-sm text-red-700 whitespace-pre-wrap">{expense.rejection_reason}</p>
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
    </div>
  )
}
