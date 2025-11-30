'use client'

/**
 * QuotationWinDialog Component
 * Dialog for marking a quotation as won and creating a sales control
 */

import { useEffect, useState } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { formatDate } from '@/lib/utils'
import type { QuotationWinRequest, SalesControlLineCreate } from '@/types/sales'
import type { ProductLine } from '@/types/sales'

/**
 * Validation schema for quotation win form
 */
const quotationWinSchema = z.object({
  won_date: z.string().min(1, 'Won date is required'),
  sales_control_folio: z.string().min(1, 'Folio number is required').max(50),
  po_number: z.string().min(1, 'PO number is required').max(50),
  po_reception_date: z.string().min(1, 'PO reception date is required'),
  lead_time_days: z.number().int().min(0).max(365).optional(),
  lines: z.array(
    z.object({
      product_line_id: z.string().min(1, 'Product line is required'),
      line_amount: z.number().min(0.01, 'Amount must be greater than 0'),
    })
  ).min(1, 'At least one product line is required'),
})

type QuotationWinFormData = z.infer<typeof quotationWinSchema>

interface QuotationWinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotationAmount: number
  onSubmit: (data: QuotationWinRequest) => Promise<void>
  productLines: ProductLine[]
  isLoading?: boolean
}

export function QuotationWinDialog({
  open,
  onOpenChange,
  quotationAmount,
  onSubmit,
  productLines,
  isLoading = false,
}: QuotationWinDialogProps) {
  const [promiseDate, setPromiseDate] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<QuotationWinFormData>({
    resolver: zodResolver(quotationWinSchema),
    defaultValues: {
      won_date: new Date().toISOString().split('T')[0],
      sales_control_folio: '',
      po_number: '',
      po_reception_date: new Date().toISOString().split('T')[0],
      lead_time_days: 30,
      lines: [{ product_line_id: '', line_amount: quotationAmount }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  })

  // Watch values for calculations
  const poReceptionDate = watch('po_reception_date')
  const leadTimeDays = watch('lead_time_days')
  const lines = watch('lines')

  // Calculate promise date
  useEffect(() => {
    if (poReceptionDate && leadTimeDays) {
      const receptionDate = new Date(poReceptionDate)
      const calculatedDate = new Date(receptionDate)
      calculatedDate.setDate(calculatedDate.getDate() + leadTimeDays)
      setPromiseDate(calculatedDate.toISOString().split('T')[0])
    } else {
      setPromiseDate('')
    }
  }, [poReceptionDate, leadTimeDays])

  // Calculate total from lines
  const totalFromLines = lines.reduce(
    (sum, line) => sum + (Number(line.line_amount) || 0),
    0
  )

  const handleFormSubmit = async (data: QuotationWinFormData) => {
    await onSubmit(data)
    reset()
  }

  const handleAddLine = () => {
    append({ product_line_id: '', line_amount: 0 })
  }

  const getAvailableProductLines = (currentIndex: number) => {
    const selectedIds = lines
      .map((line, index) => (index !== currentIndex ? line.product_line_id : null))
      .filter(Boolean)
    return productLines.filter((pl) => !selectedIds.includes(pl.id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark Quotation as Won</DialogTitle>
          <DialogDescription>
            Enter the details to create a sales control from this quotation
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Won Date and Folio */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="won_date">
                Won Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="won_date"
                type="date"
                {...register('won_date')}
                disabled={isLoading}
                className={errors.won_date ? 'border-red-500' : ''}
              />
              {errors.won_date && (
                <p className="text-sm text-red-500">{errors.won_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sales_control_folio">
                Sales Control Folio <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sales_control_folio"
                {...register('sales_control_folio')}
                placeholder="SC-2024-001"
                disabled={isLoading}
                className={errors.sales_control_folio ? 'border-red-500' : ''}
              />
              {errors.sales_control_folio && (
                <p className="text-sm text-red-500">
                  {errors.sales_control_folio.message}
                </p>
              )}
            </div>
          </div>

          {/* PO Number and Reception Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="po_number">
                PO Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="po_number"
                {...register('po_number')}
                placeholder="PO-2024-001"
                disabled={isLoading}
                className={errors.po_number ? 'border-red-500' : ''}
              />
              {errors.po_number && (
                <p className="text-sm text-red-500">{errors.po_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="po_reception_date">
                PO Reception Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="po_reception_date"
                type="date"
                {...register('po_reception_date')}
                disabled={isLoading}
                className={errors.po_reception_date ? 'border-red-500' : ''}
              />
              {errors.po_reception_date && (
                <p className="text-sm text-red-500">
                  {errors.po_reception_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Lead Time and Promise Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead_time_days">Lead Time (Days)</Label>
              <Input
                id="lead_time_days"
                type="number"
                {...register('lead_time_days', { valueAsNumber: true })}
                placeholder="30"
                disabled={isLoading}
                min={0}
                max={365}
                className={errors.lead_time_days ? 'border-red-500' : ''}
              />
              {errors.lead_time_days && (
                <p className="text-sm text-red-500">
                  {errors.lead_time_days.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Promise Date (Calculated)</Label>
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
                <Calculator className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">
                  {promiseDate ? formatDate(promiseDate) : 'Set lead time'}
                </span>
              </div>
            </div>
          </div>

          {/* Product Line Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                Product Line Breakdown <span className="text-red-500">*</span>
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
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`lines.${index}.line_amount`, {
                          valueAsNumber: true,
                        })}
                        placeholder="0.00"
                        disabled={isLoading}
                        className={
                          errors.lines?.[index]?.line_amount ? 'border-red-500' : ''
                        }
                      />
                    </div>
                  </div>

                  {fields.length > 1 && (
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
                  )}
                </div>
              ))}
            </div>

            {errors.lines && (
              <p className="text-sm text-red-500">{errors.lines.message}</p>
            )}

            {/* Total Validation */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <div className="text-sm">
                <span className="text-muted-foreground">Lines Total: </span>
                <span className="font-semibold">
                  ${totalFromLines.toFixed(2)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Quotation Amount: </span>
                <span className="font-semibold">
                  ${quotationAmount.toFixed(2)}
                </span>
              </div>
              {Math.abs(totalFromLines - quotationAmount) > 0.01 && (
                <p className="text-sm text-amber-600">
                  Total mismatch!
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark as Won & Create Sales Control
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
