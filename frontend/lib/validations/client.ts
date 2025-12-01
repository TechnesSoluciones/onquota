/**
 * Client Validation Schemas
 * Zod schemas synchronized with backend Pydantic validators
 * Source: backend/schemas/client.py
 */

import { z } from 'zod'
import { ClientStatus, ClientType, Industry } from '@/types/client'

/**
 * URL validation helper
 */
const urlSchema = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .refine(
      (val) => {
        if (!val) return true
        return val.startsWith('http://') || val.startsWith('https://')
      },
      { message: 'URL must start with http:// or https://' }
    )
    .optional()
    .nullable()

/**
 * Currency validation
 */
const currencySchema = z
  .string()
  .length(3, 'Currency code must be 3 characters (e.g., USD, EUR)')
  .transform((val) => val.toUpperCase())

/**
 * Client create schema
 * Synced with: ClientCreate schema
 */
export const clientCreateSchema = z
  .object({
    // Basic Information
    name: z
      .string()
      .min(1, 'Client name is required')
      .max(255, 'Name must not exceed 255 characters'),
    client_type: z
      .nativeEnum(ClientType, {
        errorMap: () => ({ message: 'Invalid client type' }),
      })
      .default(ClientType.COMPANY),

    // Contact Information
    email: z
      .string()
      .email('Invalid email address')
      .max(255, 'Email must not exceed 255 characters')
      .optional()
      .nullable(),
    phone: z
      .string()
      .max(50, 'Phone must not exceed 50 characters')
      .optional()
      .nullable(),
    mobile: z
      .string()
      .max(50, 'Mobile must not exceed 50 characters')
      .optional()
      .nullable(),
    website: urlSchema(255),

    // Address
    address_line1: z
      .string()
      .max(255, 'Address line 1 must not exceed 255 characters')
      .optional()
      .nullable(),
    address_line2: z
      .string()
      .max(255, 'Address line 2 must not exceed 255 characters')
      .optional()
      .nullable(),
    city: z
      .string()
      .max(100, 'City must not exceed 100 characters')
      .optional()
      .nullable(),
    state: z
      .string()
      .max(100, 'State must not exceed 100 characters')
      .optional()
      .nullable(),
    postal_code: z
      .string()
      .max(20, 'Postal code must not exceed 20 characters')
      .optional()
      .nullable(),
    country: z
      .string()
      .max(100, 'Country must not exceed 100 characters')
      .optional()
      .nullable(),

    // Business Information
    industry: z
      .nativeEnum(Industry, {
        errorMap: () => ({ message: 'Invalid industry' }),
      })
      .optional()
      .nullable(),
    tax_id: z
      .string()
      .max(50, 'Tax ID must not exceed 50 characters')
      .optional()
      .nullable(),
    bpid: z
      .string()
      .max(50, 'BPID must not exceed 50 characters')
      .optional()
      .nullable(),

    // CRM Status
    status: z
      .nativeEnum(ClientStatus, {
        errorMap: () => ({ message: 'Invalid client status' }),
      })
      .default(ClientStatus.LEAD),

    // Contact Person (for companies)
    contact_person_name: z
      .string()
      .max(255, 'Contact person name must not exceed 255 characters')
      .optional()
      .nullable(),
    contact_person_email: z
      .string()
      .email('Invalid email address')
      .max(255, 'Email must not exceed 255 characters')
      .optional()
      .nullable(),
    contact_person_phone: z
      .string()
      .max(50, 'Phone must not exceed 50 characters')
      .optional()
      .nullable(),

    // Additional Information
    notes: z.string().optional().nullable(),
    tags: z
      .string()
      .max(500, 'Tags must not exceed 500 characters')
      .optional()
      .nullable(),

    // Sales Information
    lead_source: z
      .string()
      .max(100, 'Lead source must not exceed 100 characters')
      .optional()
      .nullable(),
    first_contact_date: z.string().optional().nullable(),
    conversion_date: z.string().optional().nullable(),

    // Social Media
    linkedin_url: urlSchema(255),
    twitter_handle: z
      .string()
      .max(100, 'Twitter handle must not exceed 100 characters')
      .optional()
      .nullable(),

    // Preferences
    preferred_language: z
      .string()
      .max(10, 'Language code must not exceed 10 characters')
      .default('en'),
    preferred_currency: currencySchema.default('USD'),

    // Status
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // Validate conversion date is not before first contact date
      if (
        data.conversion_date &&
        data.first_contact_date &&
        typeof data.conversion_date === 'string' &&
        typeof data.first_contact_date === 'string'
      ) {
        const conversionDate = new Date(data.conversion_date)
        const firstContactDate = new Date(data.first_contact_date)
        return conversionDate >= firstContactDate
      }
      return true
    },
    {
      message: 'Conversion date cannot be before first contact date',
      path: ['conversion_date'],
    }
  )

/**
 * Client update schema
 * Synced with: ClientUpdate schema
 */
export const clientUpdateSchema = z
  .object({
    // Basic Information
    name: z
      .string()
      .min(1, 'Client name is required')
      .max(255, 'Name must not exceed 255 characters')
      .optional()
      .nullable(),
    client_type: z
      .nativeEnum(ClientType, {
        errorMap: () => ({ message: 'Invalid client type' }),
      })
      .optional()
      .nullable(),

    // Contact Information
    email: z
      .string()
      .email('Invalid email address')
      .max(255, 'Email must not exceed 255 characters')
      .optional()
      .nullable(),
    phone: z
      .string()
      .max(50, 'Phone must not exceed 50 characters')
      .optional()
      .nullable(),
    mobile: z
      .string()
      .max(50, 'Mobile must not exceed 50 characters')
      .optional()
      .nullable(),
    website: urlSchema(255),

    // Address
    address_line1: z
      .string()
      .max(255, 'Address line 1 must not exceed 255 characters')
      .optional()
      .nullable(),
    address_line2: z
      .string()
      .max(255, 'Address line 2 must not exceed 255 characters')
      .optional()
      .nullable(),
    city: z
      .string()
      .max(100, 'City must not exceed 100 characters')
      .optional()
      .nullable(),
    state: z
      .string()
      .max(100, 'State must not exceed 100 characters')
      .optional()
      .nullable(),
    postal_code: z
      .string()
      .max(20, 'Postal code must not exceed 20 characters')
      .optional()
      .nullable(),
    country: z
      .string()
      .max(100, 'Country must not exceed 100 characters')
      .optional()
      .nullable(),

    // Business Information
    industry: z
      .nativeEnum(Industry, {
        errorMap: () => ({ message: 'Invalid industry' }),
      })
      .optional()
      .nullable(),
    tax_id: z
      .string()
      .max(50, 'Tax ID must not exceed 50 characters')
      .optional()
      .nullable(),
    bpid: z
      .string()
      .max(50, 'BPID must not exceed 50 characters')
      .optional()
      .nullable(),

    // CRM Status
    status: z
      .nativeEnum(ClientStatus, {
        errorMap: () => ({ message: 'Invalid client status' }),
      })
      .optional()
      .nullable(),

    // Contact Person
    contact_person_name: z
      .string()
      .max(255, 'Contact person name must not exceed 255 characters')
      .optional()
      .nullable(),
    contact_person_email: z
      .string()
      .email('Invalid email address')
      .max(255, 'Email must not exceed 255 characters')
      .optional()
      .nullable(),
    contact_person_phone: z
      .string()
      .max(50, 'Phone must not exceed 50 characters')
      .optional()
      .nullable(),

    // Additional Information
    notes: z.string().optional().nullable(),
    tags: z
      .string()
      .max(500, 'Tags must not exceed 500 characters')
      .optional()
      .nullable(),

    // Sales Information
    lead_source: z
      .string()
      .max(100, 'Lead source must not exceed 100 characters')
      .optional()
      .nullable(),
    first_contact_date: z.string().optional().nullable(),
    conversion_date: z.string().optional().nullable(),

    // Social Media
    linkedin_url: urlSchema(255),
    twitter_handle: z
      .string()
      .max(100, 'Twitter handle must not exceed 100 characters')
      .optional()
      .nullable(),

    // Preferences
    preferred_language: z
      .string()
      .max(10, 'Language code must not exceed 10 characters')
      .optional()
      .nullable(),
    preferred_currency: currencySchema.optional().nullable(),

    // Status
    is_active: z.boolean().optional().nullable(),
  })
  .refine(
    (data) => {
      // Validate conversion date is not before first contact date
      if (
        data.conversion_date &&
        data.first_contact_date &&
        typeof data.conversion_date === 'string' &&
        typeof data.first_contact_date === 'string'
      ) {
        const conversionDate = new Date(data.conversion_date)
        const firstContactDate = new Date(data.first_contact_date)
        return conversionDate >= firstContactDate
      }
      return true
    },
    {
      message: 'Conversion date cannot be before first contact date',
      path: ['conversion_date'],
    }
  )

/**
 * Client filters schema (for query params)
 */
export const clientFiltersSchema = z.object({
  status: z.nativeEnum(ClientStatus).optional(),
  client_type: z.nativeEnum(ClientType).optional(),
  industry: z.nativeEnum(Industry).optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).optional(),
  page_size: z.number().int().min(1).max(100).optional(),
})

// Type exports for use in components
export type ClientCreateFormData = z.infer<typeof clientCreateSchema>
export type ClientUpdateFormData = z.infer<typeof clientUpdateSchema>
export type ClientFiltersFormData = z.infer<typeof clientFiltersSchema>
