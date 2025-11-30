'use client'

/**
 * New Product Line Page
 * Page for creating a new product line
 */

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductLineForm } from '@/components/sales/product-lines/ProductLineForm'
import { useProductLines } from '@/hooks/useProductLines'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NewProductLinePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { createProductLine } = useProductLines()

  const handleSubmit = async (data: any) => {
    try {
      await createProductLine(data)
      toast({
        title: 'Success',
        description: 'Product line created successfully',
      })
      router.push('/sales/product-lines')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create product line',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleCancel = () => {
    router.push('/sales/product-lines')
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/sales/product-lines')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Product Lines
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Create New Product Line
        </h1>
        <p className="text-muted-foreground">
          Add a new product line category to organize your sales
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Product Line Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductLineForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </div>
  )
}
