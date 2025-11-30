'use client'

/**
 * ProductLineForm Component
 * Form for creating/editing product lines
 */

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import type { ProductLine, ProductLineCreate, ProductLineUpdate } from '@/types/sales'

/**
 * Validation schema for product line form
 */
const productLineSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  code: z.string().max(20, 'Code is too long').optional().nullable(),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format. Use #RRGGBB').optional().nullable(),
  display_order: z.number().int().min(0, 'Display order must be positive').default(0),
  is_active: z.boolean().default(true),
})

type ProductLineFormData = z.infer<typeof productLineSchema>

interface ProductLineFormProps {
  productLine?: ProductLine
  onSubmit: (data: ProductLineCreate | ProductLineUpdate) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function ProductLineForm({
  productLine,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProductLineFormProps) {
  const isEditing = !!productLine

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<ProductLineFormData>({
    resolver: zodResolver(productLineSchema),
    defaultValues: {
      name: productLine?.name || '',
      code: productLine?.code || '',
      description: productLine?.description || '',
      color: productLine?.color || '#3B82F6',
      display_order: productLine?.display_order || 0,
      is_active: productLine?.is_active ?? true,
    },
  })

  // Watch color value for preview
  const colorValue = watch('color')

  useEffect(() => {
    if (productLine) {
      reset({
        name: productLine.name,
        code: productLine.code || '',
        description: productLine.description || '',
        color: productLine.color || '#3B82F6',
        display_order: productLine.display_order,
        is_active: productLine.is_active,
      })
    }
  }, [productLine, reset])

  const handleFormSubmit = async (data: ProductLineFormData) => {
    const submitData = {
      ...data,
      code: data.code || null,
      description: data.description || null,
      color: data.color || null,
    }

    await onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Premium Products"
          disabled={isLoading}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Code */}
      <div className="space-y-2">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          {...register('code')}
          placeholder="e.g., PREM"
          disabled={isLoading}
          maxLength={20}
          className={errors.code ? 'border-red-500' : ''}
        />
        {errors.code && (
          <p className="text-sm text-red-500">{errors.code.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Optional short code for this product line
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Brief description of this product line..."
          disabled={isLoading}
          rows={3}
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Color and Display Order */}
      <div className="grid grid-cols-2 gap-4">
        {/* Color Picker */}
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <div className="flex items-center gap-3">
            <Input
              id="color"
              type="color"
              {...register('color')}
              disabled={isLoading}
              className="w-20 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              {...register('color')}
              placeholder="#3B82F6"
              disabled={isLoading}
              maxLength={7}
              className={`flex-1 ${errors.color ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.color && (
            <p className="text-sm text-red-500">{errors.color.message}</p>
          )}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded border"
              style={{ backgroundColor: colorValue || '#3B82F6' }}
            />
            <p className="text-xs text-muted-foreground">Preview</p>
          </div>
        </div>

        {/* Display Order */}
        <div className="space-y-2">
          <Label htmlFor="display_order">Display Order</Label>
          <Input
            id="display_order"
            type="number"
            {...register('display_order', { valueAsNumber: true })}
            placeholder="0"
            disabled={isLoading}
            min={0}
            className={errors.display_order ? 'border-red-500' : ''}
          />
          {errors.display_order && (
            <p className="text-sm text-red-500">{errors.display_order.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Lower numbers appear first
          </p>
        </div>
      </div>

      {/* Active Status */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_active"
          {...register('is_active')}
          disabled={isLoading}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="is_active" className="cursor-pointer font-normal">
          Active (product line is available for use)
        </Label>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Update' : 'Create'} Product Line
        </Button>
      </div>
    </form>
  )
}
