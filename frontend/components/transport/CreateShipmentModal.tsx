/**
 * CreateShipmentModal Component
 * Modal for creating new shipments
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { transportApi } from '@/lib/api'
import { ShipmentStatus } from '@/types/transport'
import { Loader2 } from 'lucide-react'

const shipmentSchema = z.object({
  shipment_number: z.string().min(1, 'El número de envío es requerido').max(50),
  origin_address: z.string().min(1, 'La dirección de origen es requerida'),
  origin_city: z.string().min(1, 'La ciudad de origen es requerida'),
  destination_address: z.string().min(1, 'La dirección de destino es requerida'),
  destination_city: z.string().min(1, 'La ciudad de destino es requerida'),
  scheduled_date: z.string().min(1, 'La fecha programada es requerida'),
  freight_cost: z.string().default('0'),
  currency: z.string().default('USD'),
  description: z.string().optional(),
  weight_kg: z.string().optional(),
  quantity: z.string().optional(),
  estimated_distance_km: z.string().optional(),
  notes: z.string().optional(),
})

type ShipmentFormData = z.infer<typeof shipmentSchema>

interface CreateShipmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateShipmentModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateShipmentModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      shipment_number: '',
      origin_address: '',
      origin_city: '',
      destination_address: '',
      destination_city: '',
      scheduled_date: '',
      freight_cost: '0',
      currency: 'USD',
      description: '',
      weight_kg: '',
      quantity: '',
      estimated_distance_km: '',
      notes: '',
    },
  })

  const onSubmit = async (data: ShipmentFormData) => {
    try {
      setIsLoading(true)

      const payload: any = {
        shipment_number: data.shipment_number,
        origin_address: data.origin_address,
        origin_city: data.origin_city,
        destination_address: data.destination_address,
        destination_city: data.destination_city,
        scheduled_date: data.scheduled_date,
        freight_cost: parseFloat(data.freight_cost),
        currency: data.currency,
        status: ShipmentStatus.PENDING,
      }

      // Add optional fields
      if (data.description) payload.description = data.description
      if (data.weight_kg) payload.weight_kg = parseFloat(data.weight_kg)
      if (data.quantity) payload.quantity = parseFloat(data.quantity)
      if (data.estimated_distance_km)
        payload.estimated_distance_km = parseFloat(data.estimated_distance_km)
      if (data.notes) payload.notes = data.notes

      await transportApi.createShipment(payload)

      toast({
        title: 'Envío creado',
        description: 'El envío se ha creado exitosamente',
      })

      form.reset()
      onOpenChange(false)
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo crear el envío',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Envío</DialogTitle>
          <DialogDescription>
            Registra un nuevo envío/flete. Completa la información del origen,
            destino y carga.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Shipment Number */}
            <FormField
              control={form.control}
              name="shipment_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Envío *</FormLabel>
                  <FormControl>
                    <Input placeholder="SHIP-2025-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Origin */}
              <div className="space-y-4">
                <h3 className="font-semibold">Origen</h3>
                <FormField
                  control={form.control}
                  name="origin_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad *</FormLabel>
                      <FormControl>
                        <Input placeholder="Lima" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="origin_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección *</FormLabel>
                      <FormControl>
                        <Input placeholder="Av. Principal 123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Destination */}
              <div className="space-y-4">
                <h3 className="font-semibold">Destino</h3>
                <FormField
                  control={form.control}
                  name="destination_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad *</FormLabel>
                      <FormControl>
                        <Input placeholder="Arequipa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destination_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección *</FormLabel>
                      <FormControl>
                        <Input placeholder="Calle Comercio 456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Scheduled Date */}
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Programada *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Freight Cost */}
              <FormField
                control={form.control}
                name="freight_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo de Flete</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="500.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Weight */}
              <FormField
                control={form.control}
                name="weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estimated Distance */}
              <FormField
                control={form.control}
                name="estimated_distance_km"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Distancia Estimada (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción de la Carga</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción de la mercancía..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Envío
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
