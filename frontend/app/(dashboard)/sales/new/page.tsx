'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreateQuoteModal } from '@/components/sales/CreateQuoteModal'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NewSalePage() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(true)

  useEffect(() => {
    // Open modal on mount
    setModalOpen(true)
  }, [])

  const handleClose = () => {
    setModalOpen(false)
    // Redirect to sales list after closing
    setTimeout(() => router.push('/sales'), 200)
  }

  const handleSuccess = () => {
    setModalOpen(false)
    // Redirect to sales list after success
    setTimeout(() => router.push('/sales'), 200)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/sales')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nueva Cotización</h1>
          <p className="text-muted-foreground">
            Crea una nueva cotización para tus clientes
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Complete el formulario para generar una nueva cotización. Podrá agregar
          múltiples productos o servicios y enviarla directamente al cliente.
        </p>
      </div>

      {/* Modal */}
      <CreateQuoteModal
        open={modalOpen}
        onOpenChange={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
