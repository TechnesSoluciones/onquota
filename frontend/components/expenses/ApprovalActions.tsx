'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { expensesApi } from '@/lib/api/expenses'
import { useToast } from '@/hooks/use-toast'
import type { ExpenseResponse } from '@/types/expense'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface ApprovalActionsProps {
  expense: ExpenseResponse
  onSuccess: () => void
}

export function ApprovalActions({ expense, onSuccess }: ApprovalActionsProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)

  const handleAction = async (newStatus: string) => {
    try {
      setIsLoading(true)

      await expensesApi.updateExpenseStatus(expense.id, {
        status: newStatus as any,
        rejection_reason: newStatus === 'rejected' ? notes : undefined,
      })

      toast({
        title: 'Éxito',
        description: `Gasto ${newStatus === 'approved' ? 'aprobado' : 'rechazado'} correctamente`,
      })

      setShowNotes(false)
      setNotes('')
      setAction(null)
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.detail || 'Error al procesar la solicitud',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (showNotes && action) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="approval-notes">
            Notas {action === 'approve' ? 'de aprobación' : 'de rechazo'} (opcional)
          </Label>
          <Textarea
            id="approval-notes"
            placeholder="Agrega comentarios..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleAction(action === 'approve' ? 'approved' : 'rejected')}
            disabled={isLoading}
            className="flex-1"
            variant={action === 'approve' ? 'default' : 'destructive'}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar {action === 'approve' ? 'Aprobación' : 'Rechazo'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowNotes(false)
              setAction(null)
              setNotes('')
            }}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={() => {
          setAction('approve')
          setShowNotes(true)
        }}
        className="w-full"
        variant="default"
      >
        <CheckCircle className="mr-2 h-4 w-4" />
        Aprobar Gasto
      </Button>

      <Button
        onClick={() => {
          setAction('reject')
          setShowNotes(true)
        }}
        className="w-full"
        variant="destructive"
      >
        <XCircle className="mr-2 h-4 w-4" />
        Rechazar Gasto
      </Button>
    </div>
  )
}
