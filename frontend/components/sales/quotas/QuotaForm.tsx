'use client'

/**
 * QuotaForm Component
 * Form for creating/editing quotas with product line breakdown
 */

import { useEffect, useState } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Trash2, Calculator } from 'lucide-react'
import type { Quota, QuotaCreate, QuotaUpdate } from '@/types/sales'
import type { ProductLine } from '@/types/sales'

/**
 * Validation schema for quota form
 */
const quotaSchema = z.object({
  user_id: z.string().min(1, 'User is required'),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  lines: z.array(
    z.object({
      product_line_id: z.string().min(1, 'Product line is required'),
      quota_amount: z.number().min(0.01, 'Quota amount must be greater than 0'),
    })
  ).min(1, 'At least one product line is required'),
})

type QuotaFormData = z.infer<typeof quotaSchema>

interface QuotaFormProps {
  quota?: Quota
  onSubmit: (data: QuotaCreate | QuotaUpdate) => Promise<void>
  onCancel: () => void
  productLines: ProductLine[]
  users: Array<{ id: string; name: string }>
  isLoading?: boolean
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

export function QuotaForm({
  quota,
  onSubmit,
  onCancel,
  productLines,
  users,
  isLoading = false,
}: QuotaFormProps) {
  const isEditing = !!quota
  const currentDate = new Date()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<QuotaFormData>({
    resolver: zodResolver(quotaSchema),
    defaultValues: {
      user_id: quota?.user_id || '',
      year: quota?.year || currentDate.getFullYear(),
      month: quota?.month || currentDate.getMonth() + 1,
      lines: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  })

  // Watch lines for total calculation
  const lines = watch('lines')

  // Calculate total quota
  const totalQuota = lines.reduce(
    (sum, line) => sum + (Number(line.quota_amount) || 0),
    0
  )

  const handleFormSubmit = async (data: QuotaFormData) => {
    await onSubmit(data)
  }

  const handleAddLine = () => {
    append({ product_line_id: '', quota_amount: 0 })
  }

  const getAvailableProductLines = (currentIndex: number) => {
    const selectedIds = lines
      .map((line, index) => (index !== currentIndex ? line.product_line_id : null))
      .filter(Boolean)
    return productLines.filter((pl) => !selectedIds.includes(pl.id))
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* User, Year, and Month */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="user_id">
            User <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="user_id"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.user_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.user_id && (
            <p className="text-sm text-red-500">{errors.user_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="year">
            Year <span className="text-red-500">*</span>
          </Label>
          <Input
            id="year"
            type="number"
            {...register('year', { valueAsNumber: true })}
            placeholder="2024"
            disabled={isLoading}
            min={2020}
            max={2100}
            className={errors.year ? 'border-red-500' : ''}
          />
          {errors.year && (
            <p className="text-sm text-red-500">{errors.year.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="month">
            Month <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="month"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value.toString()}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.month ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.month && (
            <p className="text-sm text-red-500">{errors.month.message}</p>
          )}
        </div>
      </div>

      {/* Product Line Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>
            Product Line Quotas <span className="text-red-500">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddLine}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Line
          </Button>
        </div>

        {fields.length === 0 && (
          <div className="text-center py-6 border-2 border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">
              No product lines added yet. Click "Add Line" to start.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Product Line</Label>
                  <Controller
                    name={`lines.${index}.product_line_id`}
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <SelectTrigger
                          className={
                            errors.lines?.[index]?.product_line_id
                              ? 'border-red-500'
                              : ''
                          }
                        >
                          <SelectValue placeholder="Select product line" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableProductLines(index).map((pl) => (
                            <SelectItem key={pl.id} value={pl.id}>
                              {pl.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Quota Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`lines.${index}.quota_amount`, {
                      valueAsNumber: true,
                    })}
                    placeholder="0.00"
                    disabled={isLoading}
                    className={
                      errors.lines?.[index]?.quota_amount ? 'border-red-500' : ''
                    }
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                disabled={isLoading}
                className="mt-6 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {errors.lines && (
          <p className="text-sm text-red-500">{errors.lines.message}</p>
        )}

        {/* Total Quota Display */}
        {fields.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Quota:</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">
              ${totalQuota.toFixed(2)}
            </span>
          </div>
        )}
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
          {isEditing ? 'Update' : 'Create'} Quota
        </Button>
      </div>
    </form>
  )
}
