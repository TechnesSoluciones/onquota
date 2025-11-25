'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createExpenseSchema, type CreateExpenseFormData } from '@/lib/validations/expense'
import { expensesApi, expenseCategoriesApi } from '@/lib/api/expenses'
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
import type { ExpenseCategoryResponse } from '@/types/expense'

interface CreateExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateExpenseModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateExpenseModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<ExpenseCategoryResponse[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<CreateExpenseFormData>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      currency: 'COP',
      date: new Date().toISOString().split('T')[0],
    },
  })

  // Load categories when modal opens
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await expenseCategoriesApi.getCategories()
        setCategories(cats)
      } catch {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las categorías',
          variant: 'destructive',
        })
      }
    }

    if (open) {
      loadCategories()
    }
  }, [open, toast])

  const onSubmit = async (data: CreateExpenseFormData) => {
    try {
      setIsLoading(true)

      // Convert empty strings to undefined for optional fields
      const submitData = {
        ...data,
        amount: Number(data.amount),
        category_id: data.category_id || undefined,
        vendor_name: data.vendor_name || undefined,
        receipt_url: data.receipt_url || undefined,
        receipt_number: data.receipt_number || undefined,
        notes: data.notes || undefined,
      }

      await expensesApi.createExpense(submitData)

      toast({
        title: 'Éxito',
        description: 'Gasto creado correctamente',
      })

      reset()
      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) {
      const err = error as any
      const message = err?.response?.data?.detail || err?.message || 'Error al crear el gasto'
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Gasto</DialogTitle>
          <DialogDescription>
            Registra un nuevo gasto. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Row 1: Amount and Currency */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Monto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount', { valueAsNumber: true })}
                disabled={isLoading}
                aria-invalid={errors.amount ? 'true' : 'false'}
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
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
                      <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                      <SelectItem value="USD">USD - Dólar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Row 2: Date and Category */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">
                Fecha del Gasto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
                max={new Date().toISOString().split('T')[0]}
                disabled={isLoading}
                aria-invalid={errors.date ? 'true' : 'false'}
              />
              {errors.date && (
                <p className="text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">Categoría</Label>
              <Controller
                name="category_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="category_id">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category_id && (
                <p className="text-sm text-red-600">{errors.category_id.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe el gasto en detalle..."
              {...register('description')}
              disabled={isLoading}
              aria-invalid={errors.description ? 'true' : 'false'}
            />
            <div className="flex justify-between items-start">
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                Máximo 500 caracteres
              </p>
            </div>
          </div>

          {/* Row 3: Vendor and Receipt Number */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor_name">Proveedor</Label>
              <Input
                id="vendor_name"
                placeholder="Nombre del proveedor o negocio"
                {...register('vendor_name')}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt_number">Número de Recibo</Label>
              <Input
                id="receipt_number"
                placeholder="Ej: INV-12345"
                {...register('receipt_number')}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Receipt URL */}
          <div className="space-y-2">
            <Label htmlFor="receipt_url">URL de Recibo</Label>
            <Input
              id="receipt_url"
              type="url"
              placeholder="https://ejemplo.com/recibo.pdf"
              {...register('receipt_url')}
              disabled={isLoading}
            />
            {errors.receipt_url && (
              <p className="text-sm text-red-600">{errors.receipt_url.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              placeholder="Información adicional sobre el gasto..."
              {...register('notes')}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Máximo 1000 caracteres
            </p>
          </div>

          <DialogFooter className="mt-8">
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
              Crear Gasto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
