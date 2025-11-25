/**
 * CreateVehicleModal Component
 * Modal for creating new vehicles
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
import { VehicleType, VehicleStatus } from '@/types/transport'
import { Loader2 } from 'lucide-react'

const vehicleSchema = z.object({
  plate_number: z.string().min(1, 'La placa es requerida').max(20),
  brand: z.string().min(1, 'La marca es requerida').max(100),
  model: z.string().min(1, 'El modelo es requerido').max(100),
  year: z.string().max(4).optional(),
  vehicle_type: z.nativeEnum(VehicleType),
  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.ACTIVE),
  capacity_kg: z.string().optional(),
  fuel_type: z.string().max(50).optional(),
  fuel_efficiency_km_l: z.string().optional(),
  mileage_km: z.string().optional(),
  notes: z.string().optional(),
})

type VehicleFormData = z.infer<typeof vehicleSchema>

interface CreateVehicleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateVehicleModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateVehicleModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate_number: '',
      brand: '',
      model: '',
      year: '',
      vehicle_type: VehicleType.CAR,
      status: VehicleStatus.ACTIVE,
      capacity_kg: '',
      fuel_type: '',
      fuel_efficiency_km_l: '',
      mileage_km: '',
      notes: '',
    },
  })

  const onSubmit = async (data: VehicleFormData) => {
    try {
      setIsLoading(true)

      const payload: any = {
        plate_number: data.plate_number,
        brand: data.brand,
        model: data.model,
        vehicle_type: data.vehicle_type,
        status: data.status,
      }

      // Add optional fields if provided
      if (data.year) payload.year = data.year
      if (data.capacity_kg) payload.capacity_kg = parseFloat(data.capacity_kg)
      if (data.fuel_type) payload.fuel_type = data.fuel_type
      if (data.fuel_efficiency_km_l)
        payload.fuel_efficiency_km_l = parseFloat(data.fuel_efficiency_km_l)
      if (data.mileage_km) payload.mileage_km = parseFloat(data.mileage_km)
      if (data.notes) payload.notes = data.notes

      await transportApi.createVehicle(payload)

      toast({
        title: 'Vehículo creado',
        description: 'El vehículo se ha creado exitosamente',
      })

      form.reset()
      onOpenChange(false)
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo crear el vehículo',
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
          <DialogTitle>Crear Nuevo Vehículo</DialogTitle>
          <DialogDescription>
            Agrega un vehículo a la flota. Completa la información básica del
            vehículo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Plate Number */}
              <FormField
                control={form.control}
                name="plate_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa *</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC-123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Brand */}
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca *</FormLabel>
                    <FormControl>
                      <Input placeholder="Toyota" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Model */}
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Hilux" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Year */}
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="2024"
                        {...field}
                        maxLength={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Vehicle Type */}
              <FormField
                control={form.control}
                name="vehicle_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Vehículo *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={VehicleType.CAR}>Auto</SelectItem>
                        <SelectItem value={VehicleType.VAN}>Van</SelectItem>
                        <SelectItem value={VehicleType.TRUCK}>Camión</SelectItem>
                        <SelectItem value={VehicleType.MOTORCYCLE}>
                          Motocicleta
                        </SelectItem>
                        <SelectItem value={VehicleType.OTHER}>Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={VehicleStatus.ACTIVE}>
                          Activo
                        </SelectItem>
                        <SelectItem value={VehicleStatus.MAINTENANCE}>
                          Mantenimiento
                        </SelectItem>
                        <SelectItem value={VehicleStatus.INACTIVE}>
                          Inactivo
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Capacity */}
              <FormField
                control={form.control}
                name="capacity_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidad (kg)</FormLabel>
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

              {/* Fuel Type */}
              <FormField
                control={form.control}
                name="fuel_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Combustible</FormLabel>
                    <FormControl>
                      <Input placeholder="Gasolina" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fuel Efficiency */}
              <FormField
                control={form.control}
                name="fuel_efficiency_km_l"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eficiencia (km/l)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="12.5"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mileage */}
              <FormField
                control={form.control}
                name="mileage_km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilometraje Actual</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales sobre el vehículo..."
                      rows={3}
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
                Crear Vehículo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
