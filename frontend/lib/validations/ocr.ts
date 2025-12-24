/**
 * OCR Validation Schemas
 * Zod schemas for OCR data validation
 */

import { z } from 'zod'

export const extractedDataSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters (e.g., USD)'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  category: z.string().min(1, 'Category is required'),
  items: z.array(
    z.object({
      description: z.string().min(1, 'Description is required'),
      quantity: z.number().positive('Quantity must be positive'),
      unit_price: z.number().positive('Unit price must be positive'),
    })
  ).optional(),
})

export const ocrJobConfirmSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  date: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Category is required'),
})

export type ExtractedDataInput = z.infer<typeof extractedDataSchema>
export type OCRJobConfirmInput = z.infer<typeof ocrJobConfirmSchema>
