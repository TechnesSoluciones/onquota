/**
 * Quote Types
 * TypeScript types synchronized with backend Pydantic schemas
 * Source: backend/schemas/quote.py
 */

/**
 * Sale status enum
 * Synced with: backend/models/quote.py - SaleStatus enum
 */
export enum SaleStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * Quote item response
 * Synced with: QuoteItemResponse schema
 */
export interface QuoteItem {
  id: string
  quote_id: string
  product_name: string
  description: string | null
  quantity: number
  unit_price: number
  discount_percent: number
  subtotal: number
  created_at: string
  updated_at: string
}

/**
 * Quote item create request
 * Synced with: QuoteItemCreate schema
 */
export interface QuoteItemCreate {
  product_name: string
  description?: string | null
  quantity: number
  unit_price: number
  discount_percent?: number
}

/**
 * Quote response
 * Synced with: QuoteResponse schema
 */
export interface Quote {
  id: string
  tenant_id: string
  client_id: string
  sales_rep_id: string
  quote_number: string
  total_amount: number
  currency: string
  status: SaleStatus
  valid_until: string
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Quote with items and relations
 * Synced with: QuoteWithItems schema
 */
export interface QuoteWithItems extends Quote {
  items: QuoteItem[]
  client?: any // referencia al tipo Client
  sales_rep?: any // referencia al tipo User
}

/**
 * Quote create request
 * Synced with: QuoteCreate schema
 */
export interface QuoteCreate {
  client_id: string
  currency?: string
  valid_until: string
  notes?: string | null
  items: QuoteItemCreate[]
}

/**
 * Quote update request
 * Synced with: QuoteUpdate schema
 */
export interface QuoteUpdate {
  client_id?: string
  currency?: string
  valid_until?: string
  notes?: string | null
  status?: SaleStatus
}

/**
 * Quote filters for list queries
 * Not a Pydantic schema, but useful for API calls
 */
export interface QuoteFilters {
  status?: SaleStatus
  client_id?: string
  sales_rep_id?: string
  date_from?: string
  date_to?: string
  min_amount?: number
  max_amount?: number
  search?: string
  page?: number
  page_size?: number
}

/**
 * Paginated quote list response
 * Synced with: QuoteListResponse schema
 */
export interface QuoteListResponse {
  items: Quote[]
  total: number
  page: number
  page_size: number
  pages: number
}

/**
 * Quote summary statistics
 * Synced with: QuoteSummary schema
 */
export interface QuoteSummary {
  total_quotes: number
  draft_count: number
  sent_count: number
  accepted_count: number
  rejected_count: number
  expired_count: number
  total_amount_by_status: Record<SaleStatus, number>
  conversion_rate: number
  top_clients: Array<{ client_id: string; client_name: string; total: number }>
}
