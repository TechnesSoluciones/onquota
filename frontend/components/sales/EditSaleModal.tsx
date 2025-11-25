'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  updateQuoteSchema,
  type UpdateQuoteFormData,
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
import { Loader2, AlertTriangle } from 'lucide-react'
import { QuoteItemsTable, type QuoteItemRow } from './QuoteItemsTable'
import { SaleStatus, type QuoteWithItems } from '@/types/quote'
import type { ClientResponse } from '@/types/client'

interface EditSaleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  quoteId: string | null
}

/**
 * Modal for editing existing quotes
 * Only DRAFT quotes can be edited
 */
export function EditSaleModal({
  open,
  onOpenChange,
  onSuccess,
  quoteId,
}: EditSaleModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [clients, setClients] = useState<ClientResponse[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [items, setItems] = useState<QuoteItemRow[]>([])
  const [quote, setQuote] = useState<QuoteWithItems | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<UpdateQuoteFormData>({
    resolver: zodResolver(updateQuoteSchema),
  })

  // Load quote data when modal opens
  useEffect(() => {
    const loadQuote = async () => {
      if (!quoteId || !open) return

      try {
        setLoadingQuote(true)
        const quoteData = await salesApi.getQuote(quoteId)
        setQuote(quoteData)

        // Populate form with quote data
        setValue('client_id', quoteData.client_id)
        setValue('currency', quoteData.currency)
        setValue('valid_until', quoteData.valid_until.split('T')[0])
        setValue('notes', quoteData.notes || '')

        // Populate items table
        const itemsData: QuoteItemRow[] = quoteData.items.map((item) => ({
          id: item.id,
          product_name: item.product_name,
          description: item.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          subtotal: item.subtotal,
        }))
        setItems(itemsData)
      } catch (error) {
        console.error('Error loading quote:', error)
        toast({
          title: 'Error',
          description: 'No se pudo cargar la cotización',
          variant: 'destructive',
        })
        onOpenChange(false)
      } finally {
        setLoadingQuote(false)
      }
    }

    loadQuote()
  }, [quoteId, open, setValue, toast, onOpenChange])

  // Load clients when modal opens
  useEffect(() => {
    const loadClients = async () => {
      if (!open) return

      try {
        setLoadingClients(true)
        const response = await clientsApi.getClients({ page_size: 1000 })
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

    loadClients()
  }, [open, toast])

  // Update form items when QuoteItemsTable changes
  useEffect(() => {
    setValue('items', items)
  }, [items, setValue])

  const onSubmit = async (data: UpdateQuoteFormData) => {
    if (!quoteId) return

    try {
      setIsLoading(true)

      // Validate items
      if (items.length === 0) {
        toast({
          title: 'Error de validación',
          description: 'Debe tener al menos un item en la cotización',
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

      await salesApi.updateQuote(quoteId, submitData)

      toast({
        title: 'Éxito',
        description: 'Cotización actualizada correctamente',
      })

      reset()
      setItems([])
      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) {
      const err = error as any
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Error al actualizar la cotización'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const canEdit = quote?.status === SaleStatus.DRAFT

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar Cotización {quote?.quote_number}
          </DialogTitle>
          <DialogDescription>
            {canEdit ? (
              <>
                Modifica los datos de la cotización. Los campos marcados con *
                son obligatorios.
              </>
            ) : (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Solo las cotizaciones en estado BORRADOR pueden ser editadas
                </span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {loadingQuote ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Cargando cotización...</span>
          </div>
        ) : (
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
                      disabled={!canEdit || isLoading || loadingClients}
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
                  <p className="text-sm text-red-600">
                    {errors.client_id.message}
                  </p>
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
                      disabled={!canEdit || isLoading}
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
                disabled={!canEdit || isLoading}
                aria-invalid={errors.valid_until ? 'true' : 'false'}
              />
              {errors.valid_until && (
                <p className="text-sm text-red-600">
                  {errors.valid_until.message}
                </p>
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
                readOnly={!canEdit || isLoading}
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
                disabled={!canEdit || isLoading}
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
              {canEdit && (
                <Button
                  type="submit"
                  disabled={isLoading || items.length === 0}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Actualizar Cotización
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
