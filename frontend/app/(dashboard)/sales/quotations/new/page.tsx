'use client'

/**
 * New Quotation Page V2
 * Page for creating a new quotation
 * Updated with Design System V2
 */

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { QuotationForm } from '@/components/sales/quotations/QuotationForm'
import { useCreateQuotation } from '@/hooks/useQuotations'
import { useToast } from '@/hooks/use-toast'

export default function NewQuotationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { createQuotation } = useCreateQuotation()

  const handleSubmit = async (data: any) => {
    try {
      await createQuotation(data)
      toast({
        title: 'Success',
        description: 'Quotation created successfully',
      })
      router.push('/sales/quotations')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create quotation',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleCancel = () => {
    router.push('/sales/quotations')
  }

  return (
    <PageLayout
      title="Create New Quotation"
      description="Create a new sales quotation for a client"
      breadcrumbs={[
        { label: 'Ventas', href: '/sales' },
        { label: 'Quotations', href: '/sales/quotations' },
        { label: 'New' }
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Quotation Information</CardTitle>
        </CardHeader>
        <CardContent>
          <QuotationForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </PageLayout>
  )
}
