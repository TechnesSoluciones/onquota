'use client'

/**
 * EditOpportunityModal Component
 * Modal for editing existing opportunities
 */

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  opportunityUpdateSchema,
  type OpportunityUpdateFormData,
} from '@/lib/validations/opportunity'
import { useOpportunities } from '@/hooks/useOpportunities'
import { getClients } from '@/lib/api/clients'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { OpportunityStage, STAGE_CONFIG, type Opportunity } from '@/types/opportunities'
import type { ClientResponse } from '@/types/client'

interface EditOpportunityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity: Opportunity
  onSuccess: () => void
}

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'COP', label: 'COP - Colombian Peso' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'MXN', label: 'MXN - Mexican Peso' },
]

export function EditOpportunityModal({
  open,
  onOpenChange,
  opportunity,
  onSuccess,
}: EditOpportunityModalProps) {
  const { toast } = useToast()
  const { update } = useOpportunities()
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<ClientResponse[]>([])
  const [loadingClients, setLoadingClients] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<OpportunityUpdateFormData>({
    resolver: zodResolver(opportunityUpdateSchema),
  })

  // Load clients and reset form when modal opens
  useEffect(() => {
    if (open) {
      fetchClients()
      // Format date for input field
      const expectedCloseDate = opportunity.expected_close_date
        ? new Date(opportunity.expected_close_date).toISOString().split('T')[0]
        : ''

      reset({
        name: opportunity.name,
        client_id: opportunity.client_id,
        estimated_value: opportunity.estimated_value,
        currency: opportunity.currency,
        probability: opportunity.probability,
        expected_close_date: expectedCloseDate,
        stage: opportunity.stage,
        description: opportunity.description || '',
        notes: opportunity.notes || '',
      })
    }
  }, [open, opportunity, reset])

  const fetchClients = async () => {
    try {
      setLoadingClients(true)
      const response = await getClients({ page: 1, page_size: 100 })
      setClients(response.items)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive',
      })
    } finally {
      setLoadingClients(false)
    }
  }

  const onSubmit = async (data: OpportunityUpdateFormData) => {
    try {
      setIsLoading(true)

      const submitData = {
        ...data,
        expected_close_date: data.expected_close_date || undefined,
        description: data.description || undefined,
        notes: data.notes || undefined,
      }

      const result = await update(opportunity.id, submitData)

      if (result) {
        toast({
          title: 'Success',
          description: 'Opportunity updated successfully',
        })
        onOpenChange(false)
        onSuccess()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update opportunity',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Opportunity</DialogTitle>
          <DialogDescription>
            Update opportunity information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Basic Information
            </h3>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Opportunity Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enterprise Software Deal"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Client */}
            <div className="space-y-2">
              <Label htmlFor="client_id">Client</Label>
              <Controller
                name="client_id"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loadingClients}
                  >
                    <SelectTrigger
                      className={errors.client_id ? 'border-red-500' : ''}
                    >
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
                <p className="text-sm text-red-500">
                  {errors.client_id.message}
                </p>
              )}
            </div>

            {/* Value and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_value">Estimated Value</Label>
                <Input
                  id="estimated_value"
                  type="number"
                  step="0.01"
                  {...register('estimated_value', { valueAsNumber: true })}
                  placeholder="100000"
                  className={errors.estimated_value ? 'border-red-500' : ''}
                />
                {errors.estimated_value && (
                  <p className="text-sm text-red-500">
                    {errors.estimated_value.message}
                  </p>
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
                      defaultValue={field.value}
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

            {/* Probability and Stage */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="probability">Probability (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  {...register('probability', { valueAsNumber: true })}
                  placeholder="50"
                  className={errors.probability ? 'border-red-500' : ''}
                />
                {errors.probability && (
                  <p className="text-sm text-red-500">
                    {errors.probability.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Controller
                  name="stage"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STAGE_CONFIG).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Expected Close Date */}
            <div className="space-y-2">
              <Label htmlFor="expected_close_date">Expected Close Date</Label>
              <Input
                id="expected_close_date"
                type="date"
                {...register('expected_close_date')}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of the opportunity"
                rows={3}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Additional notes"
                rows={3}
                className={errors.notes ? 'border-red-500' : ''}
              />
              {errors.notes && (
                <p className="text-sm text-red-500">{errors.notes.message}</p>
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
