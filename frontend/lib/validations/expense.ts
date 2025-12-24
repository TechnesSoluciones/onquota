import { z } from 'zod'

export const createExpenseSchema = z.object({
  amount: z
    .number()
    .positive('El monto debe ser mayor a 0')
    .min(0.01, 'El monto mínimo es 0.01'),

  currency: z
    .string()
    .length(3, 'Moneda debe tener 3 caracteres')
    .default('COP'),

  date: z
    .string()
    .refine((date) => {
      const expenseDate = new Date(date)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      return expenseDate <= today
    }, 'La fecha no puede ser futura'),

  category_id: z
    .string()
    .uuid('Categoría inválida')
    .optional()
    .or(z.literal('')),

  description: z
    .string()
    .min(5, 'La descripción debe tener al menos 5 caracteres')
    .max(500, 'La descripción no puede exceder 500 caracteres'),

  vendor_name: z
    .string()
    .max(255, 'El nombre del proveedor no puede exceder 255 caracteres')
    .optional()
    .or(z.literal('')),

  receipt_url: z
    .string()
    .url('URL inválida')
    .optional()
    .or(z.literal('')),

  receipt_number: z
    .string()
    .max(100, 'El número de recibo no puede exceder 100 caracteres')
    .optional()
    .or(z.literal('')),

  notes: z
    .string()
    .max(1000, 'Las notas no pueden exceder 1000 caracteres')
    .optional()
    .or(z.literal('')),
})

export const updateExpenseSchema = createExpenseSchema.partial()

export type CreateExpenseFormData = z.infer<typeof createExpenseSchema>
export type UpdateExpenseFormData = z.infer<typeof updateExpenseSchema>
