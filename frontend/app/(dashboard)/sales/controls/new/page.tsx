'use client'

/**
 * New Sales Control Page V2
 * Page for creating a new sales control
 * Updated with Design System V2
 */

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { SalesControlForm } from '@/components/sales/controls/SalesControlForm'
import { useCreateSalesControl } from '@/hooks/useSalesControls'
import { useProductLines } from '@/hooks/useProductLines'
import { useToast } from '@/hooks/use-toast'

// Mock users - in real app, fetch from API
const MOCK_USERS = [
  { id: 'user-1', name: 'John Doe' },
  { id: 'user-2', name: 'Jane Smith' },
  { id: 'user-3', name: 'Bob Johnson' },
]

export default function NewSalesControlPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { createSalesControl } = useCreateSalesControl()
  const { productLines } = useProductLines()

  const handleSubmit = async (data: any) => {
    try {
      await createSalesControl(data)
      toast({
        title: 'Success',
        description: 'Sales control created successfully',
      })
      router.push('/sales/controls')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create sales control',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleCancel = () => {
    router.push('/sales/controls')
  }

  return (
    <PageLayout
      title="Create New Sales Control"
      description="Create a new purchase order and track its lifecycle"
      breadcrumbs={[
        { label: 'Ventas', href: '/sales' },
        { label: 'Controls', href: '/sales/controls' },
        { label: 'New' }
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Sales Control Information</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesControlForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            productLines={productLines}
            users={MOCK_USERS}
          />
        </CardContent>
      </Card>
    </PageLayout>
  )
}
