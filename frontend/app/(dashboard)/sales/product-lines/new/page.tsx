'use client'

/**
 * New Product Line Page V2
 * Page for creating a new product line
 * Updated with Design System V2
 */

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { ProductLineForm } from '@/components/sales/product-lines/ProductLineForm'
import { useProductLines } from '@/hooks/useProductLines'
import { useToast } from '@/hooks/use-toast'

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
    <PageLayout
      title="Create New Product Line"
      description="Add a new product line category to organize your sales"
      breadcrumbs={[
        { label: 'Ventas', href: '/sales' },
        { label: 'Product Lines', href: '/sales/product-lines' },
        { label: 'New' }
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Product Line Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductLineForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </PageLayout>
  )
}
