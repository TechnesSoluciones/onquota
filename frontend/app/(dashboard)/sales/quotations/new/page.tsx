'use client'

/**
 * New Quotation Page
 * Page for creating a new quotation
 */

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuotationForm } from '@/components/sales/quotations/QuotationForm'
import { useCreateQuotation } from '@/hooks/useQuotations'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/sales/quotations')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Quotations
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Create New Quotation
        </h1>
        <p className="text-muted-foreground">
          Create a new sales quotation for a client
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Quotation Information</CardTitle>
        </CardHeader>
        <CardContent>
          <QuotationForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </div>
  )
}
