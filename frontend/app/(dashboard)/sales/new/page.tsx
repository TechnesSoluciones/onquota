'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuotationForm } from '@/components/sales/quotations/QuotationForm'
import { quotationsApi } from '@/lib/api/quotations'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { QuotationCreate } from '@/types/sales'

export default function NewSalePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: QuotationCreate) => {
    try {
      setIsLoading(true)
      await quotationsApi.createQuotation(data)

      toast({
        title: 'Cotización creada',
        description: 'La cotización se ha creado exitosamente',
      })

      router.push('/sales/quotations')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.detail || 'Error al crear la cotización',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/sales/quotations')
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/sales/quotations')}
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

      {/* Form Card */}
      <Card className="p-6">
        <QuotationForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </Card>
    </div>
  )
}
