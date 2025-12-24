/**
 * Opportunity Validation Schemas
 * Zod schemas for opportunity form validation
 */

import { z } from 'zod'
import { OpportunityStage } from '@/types/opportunities'

/**
 * Opportunity create schema
 */
export const opportunityCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  client_id: z.string().min(1, 'Client is required'),
  estimated_value: z
    .number({
      required_error: 'Estimated value is required',
      invalid_type_error: 'Estimated value must be a number',
    })
    .min(0, 'Value must be positive'),
  currency: z.string().optional(),
  probability: z
    .number()
    .min(0, 'Probability must be between 0 and 100')
    .max(100, 'Probability must be between 0 and 100')
    .optional(),
  expected_close_date: z.string().optional(),
  stage: z.nativeEnum(OpportunityStage).optional(),
  assigned_to: z.string().optional(),
  description: z.string().max(1000, 'Description is too long').optional(),
  notes: z.string().max(2000, 'Notes are too long').optional(),
})

/**
 * Opportunity update schema
 */
export const opportunityUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long').optional(),
  client_id: z.string().optional(),
  estimated_value: z.number().min(0, 'Value must be positive').optional(),
  currency: z.string().optional(),
  probability: z
    .number()
    .min(0, 'Probability must be between 0 and 100')
    .max(100, 'Probability must be between 0 and 100')
    .optional(),
  expected_close_date: z.string().optional(),
  stage: z.nativeEnum(OpportunityStage).optional(),
  assigned_to: z.string().optional(),
  description: z.string().max(1000, 'Description is too long').optional(),
  notes: z.string().max(2000, 'Notes are too long').optional(),
})

export type OpportunityCreateFormData = z.infer<typeof opportunityCreateSchema>
export type OpportunityUpdateFormData = z.infer<typeof opportunityUpdateSchema>
