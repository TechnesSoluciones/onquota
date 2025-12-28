'use client'

/**
 * Product Lines Page V2
 * Main page for managing product lines
 * Updated with Design System V2
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { LoadingState } from '@/components/patterns'
import { Icon } from '@/components/icons'
import { ProductLineList } from '@/components/sales/product-lines/ProductLineList'
import { ProductLineForm } from '@/components/sales/product-lines/ProductLineForm'
import { useProductLines } from '@/hooks/useProductLines'
import { useToast } from '@/hooks/use-toast'
import type { ProductLine } from '@/types/sales'

export default function ProductLinesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const {
    productLines,
    isLoading,
    error,
    createProductLine,
    updateProductLine,
    deleteProductLine,
  } = useProductLines()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedLine, setSelectedLine] = useState<ProductLine | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async (data: any) => {
    try {
      setIsSubmitting(true)
      await createProductLine(data)
      toast({
        title: 'Success',
        description: 'Product line created successfully',
      })
      setCreateModalOpen(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create product line',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (data: any) => {
    if (!selectedLine) return
    try {
      setIsSubmitting(true)
      await updateProductLine(selectedLine.id, data)
      toast({
        title: 'Success',
        description: 'Product line updated successfully',
      })
      setEditModalOpen(false)
      setSelectedLine(null)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update product line',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (productLine: ProductLine) => {
    if (
      !confirm(
        `Are you sure you want to delete "${productLine.name}"? This action cannot be undone.`
      )
    ) {
      return
    }

    try {
      await deleteProductLine(productLine.id)
      toast({
        title: 'Success',
        description: 'Product line deleted successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete product line',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (productLine: ProductLine) => {
    setSelectedLine(productLine)
    setEditModalOpen(true)
  }

  return (
    <PageLayout
      title="Product Lines"
      description="Manage your product line categories"
      breadcrumbs={[
        { label: 'Ventas', href: '/sales' },
        { label: 'Product Lines' }
      ]}
      actions={
        <Button onClick={() => setCreateModalOpen(true)} leftIcon={<Icon name="add" />}>
          New Product Line
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Error State */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/20">
            <Icon name="error" className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-error">Error loading product lines</p>
              <p className="text-sm text-error/80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <LoadingState message="Loading product lines..." />
        ) : (
          <ProductLineList
            productLines={productLines}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Product Line</DialogTitle>
            <DialogDescription>
              Add a new product line category to organize your sales
            </DialogDescription>
          </DialogHeader>
          <ProductLineForm
            onSubmit={handleCreate}
            onCancel={() => setCreateModalOpen(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product Line</DialogTitle>
            <DialogDescription>
              Update the product line information
            </DialogDescription>
          </DialogHeader>
          <ProductLineForm
            productLine={selectedLine || undefined}
            onSubmit={handleUpdate}
            onCancel={() => {
              setEditModalOpen(false)
              setSelectedLine(null)
            }}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
      </div>
    </PageLayout>
  )
}
