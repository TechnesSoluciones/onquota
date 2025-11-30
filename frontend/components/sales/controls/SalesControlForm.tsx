'use client'

/**
 * SalesControlForm Component
 * Form for creating/editing sales controls
 */

import { useEffect, useState } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Trash2, Calculator } from 'lucide-react'
import { getClients } from '@/lib/api/clients'
import { formatDate } from '@/lib/utils'
import type { SalesControl, SalesControlCreate, SalesControlUpdate } from '@/types/sales'
import type { ClientResponse } from '@/types/client'
import type { ProductLine } from '@/types/sales'

/**
 * Validation schema for sales control form
 */
const salesControlSchema = z.object({
  folio_number: z.string().min(1, 'Folio number is required').max(50),
  po_number: z.string().min(1, 'PO number is required').max(50),
  po_reception_date: z.string().min(1, 'PO reception date is required'),
  lead_time_days: z.number().int().min(0).max(365).optional().nullable(),
  client_id: z.string().min(1, 'Client is required'),
  assigned_to: z.string().min(1, 'Assigned to is required'),
  total_amount: z.number().min(0.01, 'Total amount must be greater than 0'),
  currency: z.string().default('COP'),
  concept: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  lines: z.array(
    z.object({
      product_line_id: z.string().min(1, 'Product line is required'),
      line_amount: z.number().min(0.01, 'Amount must be greater than 0'),
    })
  ).min(1, 'At least one product line is required'),
})

type SalesControlFormData = z.infer<typeof salesControlSchema>

interface SalesControlFormProps {
  salesControl?: SalesControl
  onSubmit: (data: SalesControlCreate | SalesControlUpdate) => Promise<void>
  onCancel: () => void
  productLines: ProductLine[]
  users: Array<{ id: string; name: string }>
  isLoading?: boolean
}

const CURRENCIES = [
  { value: 'COP', label: 'COP - Colombian Peso' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'MXN', label: 'MXN - Mexican Peso' },
]

export function SalesControlForm({
  salesControl,
  onSubmit,
  onCancel,
  productLines,
  users,
  isLoading = false,
}: SalesControlFormProps) {
  const isEditing = !!salesControl
  const [clients, setClients] = useState<ClientResponse[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [promiseDate, setPromiseDate] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<SalesControlFormData>({
    resolver: zodResolver(salesControlSchema),
    defaultValues: {
      folio_number: salesControl?.folio_number || '',
      po_number: salesControl?.po_number || '',
      po_reception_date: salesControl?.po_reception_date || new Date().toISOString().split('T')[0],
      lead_time_days: salesControl?.lead_time_days || 30,
      client_id: salesControl?.client_id || '',
      assigned_to: salesControl?.assigned_to || '',
      total_amount: salesControl?.total_amount || 0,
      currency: salesControl?.currency || 'COP',
      concept: salesControl?.concept || '',
      notes: salesControl?.notes || '',
      lines: [],
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
  const totalAmount = watch('total_amount')

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

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true)
        const response = await getClients({ page: 1, page_size: 100 })
        setClients(response.items)
      } catch (error) {
        console.error('Failed to load clients:', error)
      } finally {
        setLoadingClients(false)
      }
    }
    fetchClients()
  }, [])

  useEffect(() => {
    if (salesControl) {
      reset({
        folio_number: salesControl.folio_number,
        po_number: salesControl.po_number,
        po_reception_date: salesControl.po_reception_date,
        lead_time_days: salesControl.lead_time_days || 30,
        client_id: salesControl.client_id,
        assigned_to: salesControl.assigned_to,
        total_amount: salesControl.total_amount,
        currency: salesControl.currency || 'COP',
        concept: salesControl.concept || '',
        notes: salesControl.notes || '',
        lines: [],
      })
    }
  }, [salesControl, reset])

  // Calculate total from lines
  const totalFromLines = lines.reduce(
    (sum, line) => sum + (Number(line.line_amount) || 0),
    0
  )

  const handleFormSubmit = async (data: SalesControlFormData) => {
    const submitData = {
      ...data,
      lead_time_days: data.lead_time_days || null,
      concept: data.concept || null,
      notes: data.notes || null,
    }

    await onSubmit(submitData)
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Folio and PO Number */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="folio_number">
            Folio Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="folio_number"
            {...register('folio_number')}
            placeholder="SC-2024-001"
            disabled={isLoading}
            className={errors.folio_number ? 'border-red-500' : ''}
          />
          {errors.folio_number && (
            <p className="text-sm text-red-500">{errors.folio_number.message}</p>
          )}
        </div>

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
      </div>

      {/* PO Reception Date and Lead Time */}
      <div className="grid grid-cols-2 gap-4">
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
            <p className="text-sm text-red-500">{errors.lead_time_days.message}</p>
          )}
        </div>
      </div>

      {/* Promise Date (Calculated) */}
      <div className="space-y-2">
        <Label>Promise Date (Calculated)</Label>
        <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
          <Calculator className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="text-sm">
            {promiseDate ? formatDate(promiseDate) : 'Set lead time to calculate'}
          </span>
        </div>
      </div>

      {/* Client and Assigned To */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="client_id">
            Client <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="client_id"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoading || loadingClients}
              >
                <SelectTrigger className={errors.client_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.client_id && (
            <p className="text-sm text-red-500">{errors.client_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assigned_to">
            Assigned To <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="assigned_to"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.assigned_to ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select sales rep" />
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
          {errors.assigned_to && (
            <p className="text-sm text-red-500">{errors.assigned_to.message}</p>
          )}
        </div>
      </div>

      {/* Total Amount and Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="total_amount">
            Total Amount <span className="text-red-500">*</span>
          </Label>
          <Input
            id="total_amount"
            type="number"
            step="0.01"
            {...register('total_amount', { valueAsNumber: true })}
            placeholder="0.00"
            disabled={isLoading}
            className={errors.total_amount ? 'border-red-500' : ''}
          />
          {errors.total_amount && (
            <p className="text-sm text-red-500">{errors.total_amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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

        {/* Total Validation */}
        {fields.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
            <div className="text-sm">
              <span className="text-muted-foreground">Lines Total: </span>
              <span className="font-semibold">${totalFromLines.toFixed(2)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Total Amount: </span>
              <span className="font-semibold">${Number(totalAmount).toFixed(2)}</span>
            </div>
            {Math.abs(totalFromLines - Number(totalAmount)) > 0.01 && (
              <p className="text-sm text-amber-600 font-medium">
                Totals must match!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Concept */}
      <div className="space-y-2">
        <Label htmlFor="concept">Concept</Label>
        <Input
          id="concept"
          {...register('concept')}
          placeholder="Brief description of the order..."
          disabled={isLoading}
          className={errors.concept ? 'border-red-500' : ''}
        />
        {errors.concept && (
          <p className="text-sm text-red-500">{errors.concept.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes or comments..."
          disabled={isLoading}
          rows={4}
          className={errors.notes ? 'border-red-500' : ''}
        />
        {errors.notes && (
          <p className="text-sm text-red-500">{errors.notes.message}</p>
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
          {isEditing ? 'Update' : 'Create'} Sales Control
        </Button>
      </div>
    </form>
  )
}
