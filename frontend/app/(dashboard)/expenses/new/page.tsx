'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreateExpenseModal } from '@/components/expenses/CreateExpenseModal'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NewExpensePage() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(true)

  useEffect(() => {
    // Open modal on mount
    setModalOpen(true)
  }, [])

  const handleClose = () => {
    setModalOpen(false)
    // Redirect to expenses list after closing
    setTimeout(() => router.push('/expenses'), 200)
  }

  const handleSuccess = () => {
    setModalOpen(false)
    // Redirect to expenses list after success
    setTimeout(() => router.push('/expenses'), 200)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/expenses')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nuevo Gasto</h1>
          <p className="text-muted-foreground">
            Registra un nuevo gasto en el sistema
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Complete el formulario para registrar un nuevo gasto. Puede adjuntar
          el recibo o factura para un mejor control.
        </p>
      </div>

      {/* Modal */}
      <CreateExpenseModal
        open={modalOpen}
        onOpenChange={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
