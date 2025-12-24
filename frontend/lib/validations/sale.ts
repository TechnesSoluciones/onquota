import { z } from 'zod'
import { SaleStatus } from '@/types/quote'

/**
 * Validation schema for quote items
 */
export const quoteItemSchema = z.object({
  product_name: z.string().min(1, 'Nombre del producto requerido').max(255),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().positive('Cantidad debe ser mayor a 0'),
  unit_price: z.coerce.number().min(0, 'Precio no puede ser negativo'),
  discount_percent: z.coerce.number().min(0).max(100).default(0),
})

/**
 * Validation schema for creating a new quote
 */
export const createQuoteSchema = z.object({
  client_id: z.string().uuid('Cliente inválido'),
  currency: z.string().length(3).default('USD'),
  valid_until: z.string().refine(
    (date) => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)),
    'La fecha de validez debe ser hoy o futura'
  ),
  notes: z.string().optional().nullable(),
  items: z.array(quoteItemSchema).min(1, 'Debe agregar al menos un item'),
})

/**
 * Validation schema for updating a quote
 */
export const updateQuoteSchema = createQuoteSchema.partial().extend({
  status: z.nativeEnum(SaleStatus).optional(),
})

/**
 * Type inference for quote item form data
 */
export type QuoteItemFormData = z.infer<typeof quoteItemSchema>

/**
 * Type inference for create quote form data
 */
export type CreateQuoteFormData = z.infer<typeof createQuoteSchema>

/**
 * Type inference for update quote form data
 */
export type UpdateQuoteFormData = z.infer<typeof updateQuoteSchema>
