'use client'

/**
 * QuotationForm Component
 * Form for creating/editing quotations
 */

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import { Loader2 } from 'lucide-react'
import { getClients } from '@/lib/api/clients'
import type { Quotation, QuotationCreate, QuotationUpdate } from '@/types/sales'
import type { ClientResponse } from '@/types/client'

/**
 * Validation schema for quotation form
 */
const quotationSchema = z.object({
  quotation_number: z.string().min(1, 'Quotation number is required').max(50),
  quotation_date: z.string().min(1, 'Quotation date is required'),
  client_id: z.string().min(1, 'Client is required'),
  total_amount: z.number().min(0.01, 'Total amount must be greater than 0'),
  currency: z.string().default('COP'),
  validity_days: z.number().int().min(1).max(365).optional(),
  notes: z.string().max(1000).optional().nullable(),
})

type QuotationFormData = z.infer<typeof quotationSchema>

interface QuotationFormProps {
  quotation?: Quotation
  onSubmit: (data: QuotationCreate | QuotationUpdate) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const CURRENCIES = [
  { value: 'COP', label: 'COP - Colombian Peso' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'MXN', label: 'MXN - Mexican Peso' },
]

export function QuotationForm({
  quotation,
  onSubmit,
  onCancel,
  isLoading = false,
}: QuotationFormProps) {
  const isEditing = !!quotation
  const [clients, setClients] = useState<ClientResponse[]>([])
  const [loadingClients, setLoadingClients] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      quotation_number: quotation?.quotation_number || '',
      quotation_date: quotation?.quotation_date || new Date().toISOString().split('T')[0],
      client_id: quotation?.client_id || '',
      total_amount: quotation?.total_amount || 0,
      currency: quotation?.currency || 'COP',
      validity_days: quotation?.validity_days || 30,
      notes: quotation?.notes || '',
    },
  })

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
    if (quotation) {
      reset({
        quotation_number: quotation.quotation_number,
        quotation_date: quotation.quotation_date,
        client_id: quotation.client_id,
        total_amount: quotation.total_amount,
        currency: quotation.currency || 'COP',
        validity_days: quotation.validity_days || 30,
        notes: quotation.notes || '',
      })
    }
  }, [quotation, reset])

  const handleFormSubmit = async (data: QuotationFormData) => {
    const submitData = {
      ...data,
      notes: data.notes || null,
    }

    await onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Quotation Number and Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quotation_number">
            Quotation Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="quotation_number"
            {...register('quotation_number')}
            placeholder="QUO-2024-001"
            disabled={isLoading}
            className={errors.quotation_number ? 'border-red-500' : ''}
          />
          {errors.quotation_number && (
            <p className="text-sm text-red-500">{errors.quotation_number.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quotation_date">
            Quotation Date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="quotation_date"
            type="date"
            {...register('quotation_date')}
            disabled={isLoading}
            className={errors.quotation_date ? 'border-red-500' : ''}
          />
          {errors.quotation_date && (
            <p className="text-sm text-red-500">{errors.quotation_date.message}</p>
          )}
        </div>
      </div>

      {/* Client Selection */}
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

      {/* Amount and Currency */}
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

      {/* Validity Days */}
      <div className="space-y-2">
        <Label htmlFor="validity_days">Validity Days</Label>
        <Input
          id="validity_days"
          type="number"
          {...register('validity_days', { valueAsNumber: true })}
          placeholder="30"
          disabled={isLoading}
          min={1}
          max={365}
          className={errors.validity_days ? 'border-red-500' : ''}
        />
        {errors.validity_days && (
          <p className="text-sm text-red-500">{errors.validity_days.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Number of days this quotation is valid
        </p>
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
          {isEditing ? 'Update' : 'Create'} Quotation
        </Button>
      </div>
    </form>
  )
}
