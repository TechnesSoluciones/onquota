'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createQuoteSchema,
  type CreateQuoteFormData,
} from '@/lib/validations/sale'
import { salesApi } from '@/lib/api/sales'
import { clientsApi } from '@/lib/api/clients'
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
import { QuoteItemsTable, type QuoteItemRow } from './QuoteItemsTable'
import type { ClientResponse } from '@/types/client'

interface CreateSaleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

/**
 * Modal for creating new quotes
 * Includes client selection, items table, and quote details
 */
export function CreateSaleModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateSaleModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<ClientResponse[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [items, setItems] = useState<QuoteItemRow[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<CreateQuoteFormData>({
    resolver: zodResolver(createQuoteSchema),
    defaultValues: {
      currency: 'USD',
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // Default: 30 days from now
      items: [],
    },
  })

  // Load clients when modal opens
  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoadingClients(true)
        const response = await clientsApi.getClients({ page_size: 1000 })
        // Filter only active clients
        const activeClients = response.items.filter(
          (c) => c.status === 'active' || c.status === 'lead'
        )
        setClients(activeClients)
      } catch (error) {
        console.error('Error loading clients:', error)
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los clientes',
          variant: 'destructive',
        })
      } finally {
        setLoadingClients(false)
      }
    }

    if (open) {
      loadClients()
      // Reset items when modal opens
      setItems([])
    }
  }, [open, toast])

  // Update form items when QuoteItemsTable changes
  useEffect(() => {
    setValue('items', items)
  }, [items, setValue])

  const onSubmit = async (data: CreateQuoteFormData) => {
    try {
      setIsLoading(true)

      // Validate items
      if (items.length === 0) {
        toast({
          title: 'Error de validación',
          description: 'Debe agregar al menos un item a la cotización',
          variant: 'destructive',
        })
        return
      }

      // Transform items to match backend schema
      const itemsData = items.map((item) => ({
        product_name: item.product_name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
      }))

      // Prepare submission data
      const submitData = {
        client_id: data.client_id,
        currency: data.currency,
        valid_until: data.valid_until,
        notes: data.notes || null,
        items: itemsData,
      }

      await salesApi.createQuote(submitData)

      toast({
        title: 'Éxito',
        description: 'Cotización creada correctamente',
      })

      reset()
      setItems([])
      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) {
      const err = error as any
      const message =
        err?.response?.data?.detail || err?.message || 'Error al crear la cotización'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nueva Cotización</DialogTitle>
          <DialogDescription>
            Complete los datos de la cotización y agregue los items. Los campos
            marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Row 1: Client and Currency */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client_id">
                Cliente <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="client_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading || loadingClients}
                  >
                    <SelectTrigger id="client_id">
                      {loadingClients ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          <span>Cargando clientes...</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Selecciona un cliente" />
                      )}
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
                <p className="text-sm text-red-600">{errors.client_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">
                Moneda <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - Dólar</SelectItem>
                      <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.currency && (
                <p className="text-sm text-red-600">{errors.currency.message}</p>
              )}
            </div>
          </div>

          {/* Row 2: Valid Until */}
          <div className="space-y-2">
            <Label htmlFor="valid_until">
              Válida Hasta <span className="text-red-500">*</span>
            </Label>
            <Input
              id="valid_until"
              type="date"
              {...register('valid_until')}
              min={new Date().toISOString().split('T')[0]}
              disabled={isLoading}
              aria-invalid={errors.valid_until ? 'true' : 'false'}
            />
            {errors.valid_until && (
              <p className="text-sm text-red-600">{errors.valid_until.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Fecha hasta la cual la cotización es válida
            </p>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <Label>
              Items de la Cotización <span className="text-red-500">*</span>
            </Label>
            <QuoteItemsTable
              items={items}
              onChange={setItems}
              currency={control._formValues.currency || 'USD'}
              readOnly={isLoading}
            />
            {errors.items && (
              <p className="text-sm text-red-600">{errors.items.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Información adicional sobre la cotización..."
              {...register('notes')}
              disabled={isLoading}
              rows={4}
            />
            <p className="text-xs text-gray-500">
              Términos, condiciones o información adicional
            </p>
          </div>

          <DialogFooter className="mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                setItems([])
                onOpenChange(false)
              }}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || items.length === 0}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Cotización
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
