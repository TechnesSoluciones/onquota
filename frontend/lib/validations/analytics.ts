/**
 * Analytics Validation Schemas
 * Zod schemas for SPA analytics data validation
 */

import { z } from 'zod'

export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 50 * 1024 * 1024, {
      message: 'File size must be less than 50MB',
    })
    .refine(
      (file) => {
        const allowedTypes = [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
        ]
        return allowedTypes.includes(file.type)
      },
      {
        message: 'File must be Excel (.xlsx, .xls) or CSV format',
      }
    ),
})

export const analysisJobParamsSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  page: z.number().int().positive().optional(),
  page_size: z.number().int().positive().max(100).optional(),
})

export type FileUploadInput = z.infer<typeof fileUploadSchema>
export type AnalysisJobParamsInput = z.infer<typeof analysisJobParamsSchema>
