/**
 * Account Plans Validation Schemas
 * Zod schemas synchronized with backend Pydantic validators
 * Source: backend/schemas/account_plan.py
 */

import { z } from 'zod'
import { PlanStatus, MilestoneStatus, SWOTCategory } from '@/types/accounts'

/**
 * Account plan create schema
 */
export const accountPlanCreateSchema = z
  .object({
    client_id: z.string().uuid('Invalid client ID'),
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must not exceed 200 characters'),
    description: z.string().optional().nullable(),
    start_date: z.string().refine(
      (date) => {
        const parsed = new Date(date)
        return !isNaN(parsed.getTime())
      },
      { message: 'Invalid date format' }
    ),
    end_date: z
      .string()
      .refine(
        (date) => {
          if (!date) return true
          const parsed = new Date(date)
          return !isNaN(parsed.getTime())
        },
        { message: 'Invalid date format' }
      )
      .optional()
      .nullable(),
    revenue_goal: z
      .number()
      .positive('Revenue goal must be positive')
      .optional()
      .nullable(),
    status: z
      .nativeEnum(PlanStatus, {
        errorMap: () => ({ message: 'Invalid plan status' }),
      })
      .default(PlanStatus.DRAFT),
  })
  .refine(
    (data) => {
      // Validate end_date is after start_date
      if (data.end_date) {
        const startDate = new Date(data.start_date)
        const endDate = new Date(data.end_date)
        return endDate >= startDate
      }
      return true
    },
    {
      message: 'End date must be after start date',
      path: ['end_date'],
    }
  )

/**
 * Account plan update schema
 */
export const accountPlanUpdateSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must not exceed 200 characters')
      .optional()
      .nullable(),
    description: z.string().optional().nullable(),
    status: z
      .nativeEnum(PlanStatus, {
        errorMap: () => ({ message: 'Invalid plan status' }),
      })
      .optional()
      .nullable(),
    start_date: z
      .string()
      .refine(
        (date) => {
          if (!date) return true
          const parsed = new Date(date)
          return !isNaN(parsed.getTime())
        },
        { message: 'Invalid date format' }
      )
      .optional()
      .nullable(),
    end_date: z
      .string()
      .refine(
        (date) => {
          if (!date) return true
          const parsed = new Date(date)
          return !isNaN(parsed.getTime())
        },
        { message: 'Invalid date format' }
      )
      .optional()
      .nullable(),
    revenue_goal: z
      .number()
      .positive('Revenue goal must be positive')
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      // Validate end_date is after start_date if both are provided
      if (data.end_date && data.start_date) {
        const startDate = new Date(data.start_date)
        const endDate = new Date(data.end_date)
        return endDate >= startDate
      }
      return true
    },
    {
      message: 'End date must be after start date',
      path: ['end_date'],
    }
  )

/**
 * Milestone create schema
 */
export const milestoneCreateSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters'),
  description: z.string().optional().nullable(),
  due_date: z.string().refine(
    (date) => {
      const parsed = new Date(date)
      return !isNaN(parsed.getTime())
    },
    { message: 'Invalid date format' }
  ),
})

/**
 * Milestone create schema with plan date validation
 */
export const milestoneCreateWithPlanSchema = (
  planStartDate: string,
  planEndDate?: string | null
) =>
  milestoneCreateSchema.refine(
    (data) => {
      const dueDate = new Date(data.due_date)
      const startDate = new Date(planStartDate)

      // Due date must be after plan start date
      if (dueDate < startDate) {
        return false
      }

      // If plan has end date, due date must be before it
      if (planEndDate) {
        const endDate = new Date(planEndDate)
        if (dueDate > endDate) {
          return false
        }
      }

      return true
    },
    {
      message: planEndDate
        ? 'Due date must be between plan start and end dates'
        : 'Due date must be after plan start date',
      path: ['due_date'],
    }
  )

/**
 * Milestone update schema
 */
export const milestoneUpdateSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters')
    .optional()
    .nullable(),
  description: z.string().optional().nullable(),
  due_date: z
    .string()
    .refine(
      (date) => {
        if (!date) return true
        const parsed = new Date(date)
        return !isNaN(parsed.getTime())
      },
      { message: 'Invalid date format' }
    )
    .optional()
    .nullable(),
  status: z
    .nativeEnum(MilestoneStatus, {
      errorMap: () => ({ message: 'Invalid milestone status' }),
    })
    .optional()
    .nullable(),
  completed_at: z
    .string()
    .refine(
      (date) => {
        if (!date) return true
        const parsed = new Date(date)
        return !isNaN(parsed.getTime())
      },
      { message: 'Invalid date format' }
    )
    .optional()
    .nullable(),
})

/**
 * SWOT item create schema
 */
export const swotItemCreateSchema = z.object({
  category: z.nativeEnum(SWOTCategory, {
    errorMap: () => ({ message: 'Invalid SWOT category' }),
  }),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
})

/**
 * Account plan filters schema
 */
export const accountPlanFiltersSchema = z.object({
  client_id: z.string().uuid().optional(),
  status: z.nativeEnum(PlanStatus).optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).optional(),
  page_size: z.number().int().min(1).max(100).optional(),
})

// Type exports for use in components
export type AccountPlanCreateFormData = z.infer<
  typeof accountPlanCreateSchema
>
export type AccountPlanUpdateFormData = z.infer<
  typeof accountPlanUpdateSchema
>
export type MilestoneCreateFormData = z.infer<typeof milestoneCreateSchema>
export type MilestoneUpdateFormData = z.infer<typeof milestoneUpdateSchema>
export type SWOTItemCreateFormData = z.infer<typeof swotItemCreateSchema>
export type AccountPlanFiltersFormData = z.infer<
  typeof accountPlanFiltersSchema
>
