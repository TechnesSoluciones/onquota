'use client'

/**
 * New Sale Page V2
 * Create a new quotation
 * Updated with Design System V2
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuotationForm } from '@/components/sales/quotations/QuotationForm'
import { quotationsApi } from '@/lib/api/quotations'
import { Card } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
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
    <PageLayout
      title="Nueva Cotización"
      description="Crea una nueva cotización para tus clientes"
      breadcrumbs={[
        { label: 'Ventas', href: '/sales' },
        { label: 'Cotizaciones', href: '/sales/quotations' },
        { label: 'Nueva' }
      ]}
    >
      <Card className="p-6">
        <QuotationForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </Card>
    </PageLayout>
  )
}
