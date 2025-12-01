'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreateClientModal } from '@/components/clients/CreateClientModal'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NewClientPage() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(true)

  useEffect(() => {
    // Open modal on mount
    setModalOpen(true)
  }, [])

  const handleClose = () => {
    setModalOpen(false)
    // Redirect to clients list after closing
    setTimeout(() => router.push('/clients'), 200)
  }

  const handleSuccess = () => {
    setModalOpen(false)
    // Redirect to clients list after success
    setTimeout(() => router.push('/clients'), 200)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/clients')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Registrar Nuevo Cliente</h1>
          <p className="text-muted-foreground">
            Agrega un nuevo cliente al sistema
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Complete el formulario con la información del cliente. Los campos
            marcados con <span className="text-red-500">*</span> son obligatorios.
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Información básica: nombre, tipo, contacto</li>
            <li>Dirección y ubicación</li>
            <li>Datos comerciales: industria, tax ID</li>
            <li>Preferencias: idioma, moneda</li>
          </ul>
        </div>
      </div>

      {/* Modal */}
      <CreateClientModal
        open={modalOpen}
        onOpenChange={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
