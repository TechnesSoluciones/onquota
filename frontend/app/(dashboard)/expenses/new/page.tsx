'use client'

/**
 * New Expense Page V2
 * Form page for creating a new expense
 * Updated with Design System V2
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreateExpenseModal } from '@/components/expenses/CreateExpenseModal'
import { PageLayout } from '@/components/layouts'
import { Card, CardContent } from '@/components/ui-v2'
import { Icon } from '@/components/icons'

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
    <PageLayout
      title="Nuevo Gasto"
      description="Registra un nuevo gasto en el sistema"
      backLink="/expenses"
    >
      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Icon name="info" className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Complete el formulario para registrar un nuevo gasto. Puede adjuntar
              el recibo o factura para un mejor control.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <CreateExpenseModal
        open={modalOpen}
        onOpenChange={handleClose}
        onSuccess={handleSuccess}
      />
    </PageLayout>
  )
}
