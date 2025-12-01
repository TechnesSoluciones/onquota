/**
 * SPA (Special Price Agreement) Types
 * TypeScript types synchronized with backend Pydantic schemas
 * Source: backend/modules/spa/schemas.py
 */

/**
 * SPA status enum
 * Calculated based on start_date and end_date
 */
export enum SPAStatus {
  ACTIVE = 'active',     // Currently valid (today between start and end date)
  PENDING = 'pending',   // Future SPA (start date not reached)
  EXPIRED = 'expired',   // Past SPA (end date passed)
}

/**
 * Parsed row data from Excel/TSV upload
 * Synced with: SPARowData schema
 */
export interface SPARowData {
  bpid: string
  ship_to_name: string
  article_number: string
  article_description?: string | null
  list_price: number
  app_net_price: number
  uom: string
  start_date: string  // ISO date string
  end_date: string    // ISO date string
}

/**
 * Result of SPA file upload
 * Synced with: SPAUploadResult schema
 */
export interface SPAUploadResult {
  batch_id: string
  filename: string
  total_rows: number
  success_count: number
  error_count: number
  clients_created: number
  clients_linked: number
  errors: Array<{
    row?: number
    field?: string
    message: string
    data?: Record<string, any>
  }>
}

/**
 * SPA Upload Log Response
 * Synced with: SPAUploadLogResponse schema
 */
export interface SPAUploadLog {
  id: string
  batch_id: string
  filename: string
  total_rows: number
  success_count: number
  error_count: number
  duration_seconds: number | null
  error_message: string | null
  created_at: string  // ISO datetime string
  uploaded_by: string
}

/**
 * Base SPA Agreement data
 * Synced with: SPAAgreementBase schema
 */
export interface SPAAgreementBase {
  bpid: string
  ship_to_name: string
  article_number: string
  article_description?: string | null
  list_price: number
  app_net_price: number
  discount_percent: number
  uom: string
  start_date: string  // ISO date string
  end_date: string    // ISO date string
}

/**
 * SPA Agreement Response (full record)
 * Synced with: SPAAgreementResponse schema
 */
export interface SPAAgreement extends SPAAgreementBase {
  id: string
  tenant_id: string
  client_id: string
  batch_id: string
  is_active: boolean
  status: SPAStatus
  is_currently_valid: boolean
  created_at: string  // ISO datetime string
  created_by: string
}

/**
 * SPA Agreement with Client Information
 * Synced with: SPAAgreementWithClient schema
 */
export interface SPAAgreementWithClient extends SPAAgreement {
  client_name?: string | null
  client_email?: string | null
}

/**
 * Parameters for searching SPAs
 * Synced with: SPASearchParams schema
 */
export interface SPASearchParams {
  client_id?: string | null
  bpid?: string | null
  article_number?: string | null
  search?: string | null
  is_active?: boolean | null
  status?: SPAStatus | null
  start_date_from?: string | null
  start_date_to?: string | null
  end_date_from?: string | null
  end_date_to?: string | null
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

/**
 * Paginated list of SPA Agreements
 * Synced with: SPAListResponse schema
 */
export interface SPAListResponse {
  items: SPAAgreement[]
  total: number
  page: number
  limit: number
  pages: number
}

/**
 * Request to search for discount
 * Synced with: SPADiscountSearchRequest schema
 */
export interface SPADiscountSearchRequest {
  article_number: string
  client_id?: string | null
  bpid?: string | null
  check_date?: string | null  // ISO date string, defaults to today
}

/**
 * Response with best discount found
 * Synced with: SPADiscountResponse schema
 */
export interface SPADiscountResponse {
  found: boolean
  discount_percent?: number | null
  list_price?: number | null
  app_net_price?: number | null
  agreement_id?: string | null
  start_date?: string | null
  end_date?: string | null
  client_id?: string | null
  bpid?: string | null
}

/**
 * SPA Statistics
 * Synced with: SPAStatsResponse schema
 */
export interface SPAStats {
  total_agreements: number
  active_agreements: number
  pending_agreements: number
  expired_agreements: number
  total_clients: number
  total_products: number
  avg_discount: number
  max_discount: number
  min_discount: number
  total_uploads: number
  last_upload_date?: string | null  // ISO datetime string
}

/**
 * Request to export SPAs
 * Synced with: SPAExportRequest schema
 */
export interface SPAExportRequest {
  filters?: SPASearchParams | null
  format?: 'excel' | 'csv'
}

/**
 * Request to bulk delete SPAs
 * Synced with: SPABulkDeleteRequest schema
 */
export interface SPABulkDeleteRequest {
  agreement_ids: string[]
}

/**
 * Response from bulk delete
 * Synced with: SPABulkDeleteResponse schema
 */
export interface SPABulkDeleteResponse {
  deleted_count: number
  errors: Array<{
    agreement_id?: string
    message: string
  }>
}
