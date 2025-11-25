/**
 * Client Types
 * TypeScript types synchronized with backend Pydantic schemas
 * Source: backend/schemas/client.py
 */

/**
 * Client status enum
 * Synced with: backend/models/client.py - ClientStatus enum
 */
export enum ClientStatus {
  LEAD = 'lead',
  PROSPECT = 'prospect',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOST = 'lost',
}

/**
 * Client type enum
 * Synced with: backend/models/client.py - ClientType enum
 */
export enum ClientType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
}

/**
 * Industry enum
 * Synced with: backend/models/client.py - Industry enum
 */
export enum Industry {
  TECHNOLOGY = 'technology',
  HEALTHCARE = 'healthcare',
  FINANCE = 'finance',
  RETAIL = 'retail',
  MANUFACTURING = 'manufacturing',
  EDUCATION = 'education',
  REAL_ESTATE = 'real_estate',
  HOSPITALITY = 'hospitality',
  TRANSPORTATION = 'transportation',
  ENERGY = 'energy',
  AGRICULTURE = 'agriculture',
  CONSTRUCTION = 'construction',
  CONSULTING = 'consulting',
  OTHER = 'other',
}

/**
 * Client create request
 * Synced with: ClientCreate schema
 */
export interface ClientCreate {
  // Basic Information
  name: string
  client_type?: ClientType

  // Contact Information
  email?: string | null
  phone?: string | null
  mobile?: string | null
  website?: string | null

  // Address
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null

  // Business Information
  industry?: Industry | null
  tax_id?: string | null

  // CRM Status
  status?: ClientStatus

  // Contact Person (for companies)
  contact_person_name?: string | null
  contact_person_email?: string | null
  contact_person_phone?: string | null

  // Additional Information
  notes?: string | null
  tags?: string | null

  // Sales Information
  lead_source?: string | null
  first_contact_date?: string | null
  conversion_date?: string | null

  // Social Media
  linkedin_url?: string | null
  twitter_handle?: string | null

  // Preferences
  preferred_language?: string
  preferred_currency?: string

  // Status
  is_active?: boolean
}

/**
 * Client update request
 * Synced with: ClientUpdate schema
 */
export interface ClientUpdate {
  // Basic Information
  name?: string | null
  client_type?: ClientType | null

  // Contact Information
  email?: string | null
  phone?: string | null
  mobile?: string | null
  website?: string | null

  // Address
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null

  // Business Information
  industry?: Industry | null
  tax_id?: string | null

  // CRM Status
  status?: ClientStatus | null

  // Contact Person
  contact_person_name?: string | null
  contact_person_email?: string | null
  contact_person_phone?: string | null

  // Additional Information
  notes?: string | null
  tags?: string | null

  // Sales Information
  lead_source?: string | null
  first_contact_date?: string | null
  conversion_date?: string | null

  // Social Media
  linkedin_url?: string | null
  twitter_handle?: string | null

  // Preferences
  preferred_language?: string | null
  preferred_currency?: string | null

  // Status
  is_active?: boolean | null
}

/**
 * Client response
 * Synced with: ClientResponse schema
 */
export interface ClientResponse {
  id: string
  tenant_id: string

  // Basic Information
  name: string
  client_type: ClientType

  // Contact Information
  email: string | null
  phone: string | null
  mobile: string | null
  website: string | null

  // Address
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null

  // Business Information
  industry: Industry | null
  tax_id: string | null

  // CRM Status
  status: ClientStatus

  // Contact Person
  contact_person_name: string | null
  contact_person_email: string | null
  contact_person_phone: string | null

  // Additional Information
  notes: string | null
  tags: string | null

  // Sales Information
  lead_source: string | null
  first_contact_date: string | null
  conversion_date: string | null

  // Social Media
  linkedin_url: string | null
  twitter_handle: string | null

  // Preferences
  preferred_language: string
  preferred_currency: string

  // Status
  is_active: boolean

  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * Paginated client list response
 * Synced with: ClientListResponse schema
 */
export interface ClientListResponse {
  items: ClientResponse[]
  total: number
  page: number
  page_size: number
  pages: number
}

/**
 * Client summary statistics
 * Synced with: ClientSummary schema
 */
export interface ClientSummary {
  total_clients: number
  leads_count: number
  prospects_count: number
  active_count: number
  inactive_count: number
  lost_count: number
  by_industry: Array<{
    industry: string
    count: number
  }>
}

/**
 * Client filters for list queries
 * Not a Pydantic schema, but useful for API calls
 */
export interface ClientFilters {
  status?: ClientStatus
  client_type?: ClientType
  industry?: Industry
  is_active?: boolean
  search?: string
  page?: number
  page_size?: number
}

/**
 * Alias for ClientResponse
 */
export type Client = ClientResponse
