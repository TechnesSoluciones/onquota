'use client'

/**
 * New Sales Control Page
 * Page for creating a new sales control
 */

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SalesControlForm } from '@/components/sales/controls/SalesControlForm'
import { useCreateSalesControl } from '@/hooks/useSalesControls'
import { useProductLines } from '@/hooks/useProductLines'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/sales/controls')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Sales Controls
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Create New Sales Control
        </h1>
        <p className="text-muted-foreground">
          Create a new purchase order and track its lifecycle
        </p>
      </div>

      {/* Form Card */}
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
    </div>
  )
}
