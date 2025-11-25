'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateExpenseSchema, type UpdateExpenseFormData } from '@/lib/validations/expense'
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
import type { ExpenseWithCategory, ExpenseCategoryResponse } from '@/types/expense'

interface EditExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpenseWithCategory | null
  onSuccess: () => void
}

export function EditExpenseModal({
  open,
  onOpenChange,
  expense,
  onSuccess,
}: EditExpenseModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<ExpenseCategoryResponse[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<UpdateExpenseFormData>({
    resolver: zodResolver(updateExpenseSchema),
  })

  // Load categories and set form data when modal opens
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

    if (open && expense) {
      loadCategories()
      // Reset form with expense data
      reset({
        amount: Number(expense.amount),
        currency: expense.currency,
        date: expense.date,
        category_id: expense.category_id || '',
        description: expense.description,
        vendor_name: expense.vendor_name || '',
        receipt_url: expense.receipt_url || '',
        receipt_number: expense.receipt_number || '',
        notes: expense.notes || '',
      })
    }
  }, [open, expense, reset, toast])

  const onSubmit = async (data: UpdateExpenseFormData) => {
    if (!expense) {
      return
    }

    try {
      setIsLoading(true)

      // Convert empty strings to undefined for optional fields
      const submitData: any = {
        ...data,
      }

      // Only include amount if it's provided
      if (data.amount !== undefined) {
        submitData.amount = Number(data.amount)
      }

      // Convert empty strings to undefined
      if (!submitData.category_id) {
        submitData.category_id = undefined
      }
      if (!submitData.vendor_name) {
        submitData.vendor_name = undefined
      }
      if (!submitData.receipt_url) {
        submitData.receipt_url = undefined
      }
      if (!submitData.receipt_number) {
        submitData.receipt_number = undefined
      }
      if (!submitData.notes) {
        submitData.notes = undefined
      }

      await expensesApi.updateExpense(expense.id, submitData)

      toast({
        title: 'Éxito',
        description: 'Gasto actualizado correctamente',
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) {
      const err = error as any
      const message = err?.response?.data?.detail || err?.message || 'Error al actualizar el gasto'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!expense) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Gasto</DialogTitle>
          <DialogDescription>
            Actualiza los detalles del gasto. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Row 1: Amount and Currency */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">
                Monto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-amount"
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
              <Label htmlFor="edit-currency">Moneda</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="edit-currency">
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
              <Label htmlFor="edit-date">Fecha del Gasto</Label>
              <Input
                id="edit-date"
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
              <Label htmlFor="edit-category_id">Categoría</Label>
              <Controller
                name="category_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="edit-category_id">
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
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Descripción</Label>
            <Textarea
              id="edit-description"
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
              <Label htmlFor="edit-vendor_name">Proveedor</Label>
              <Input
                id="edit-vendor_name"
                placeholder="Nombre del proveedor o negocio"
                {...register('vendor_name')}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-receipt_number">Número de Recibo</Label>
              <Input
                id="edit-receipt_number"
                placeholder="Ej: INV-12345"
                {...register('receipt_number')}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Receipt URL */}
          <div className="space-y-2">
            <Label htmlFor="edit-receipt_url">URL de Recibo</Label>
            <Input
              id="edit-receipt_url"
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
            <Label htmlFor="edit-notes">Notas Adicionales</Label>
            <Textarea
              id="edit-notes"
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
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
