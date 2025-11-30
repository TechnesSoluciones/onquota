/**
 * Sales Module Types
 * TypeScript types synchronized with backend Pydantic schemas
 * Source: backend/modules/sales/
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Quotation status enum
 * Synced with: backend/models/quotation.py - QuoteStatus
 */
export enum QuotationStatus {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
}

/**
 * Sales Control status enum
 * Synced with: backend/models/sales_control.py - SalesControlStatus
 */
export enum SalesControlStatus {
  PENDING = 'pending',
  IN_PRODUCTION = 'in_production',
  DELIVERED = 'delivered',
  INVOICED = 'invoiced',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

// ============================================================================
// PRODUCT LINES
// ============================================================================

/**
 * Product Line (base interface)
 * Synced with: backend/modules/sales/product_lines/schemas.py - SalesProductLineBase
 */
export interface ProductLineBase {
  name: string
  code?: string | null
  description?: string | null
  color?: string | null  // Hex color format: #RRGGBB
  display_order: number
  is_active: boolean
}

/**
 * Product Line Create Request
 * Synced with: SalesProductLineCreate
 */
export interface ProductLineCreate extends ProductLineBase {}

/**
 * Product Line Update Request
 * Synced with: SalesProductLineUpdate
 */
export interface ProductLineUpdate {
  name?: string
  code?: string | null
  description?: string | null
  color?: string | null
  display_order?: number
  is_active?: boolean
}

/**
 * Product Line Response
 * Synced with: SalesProductLineResponse
 */
export interface ProductLine extends ProductLineBase {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/**
 * Product Line List Item
 * Synced with: SalesProductLineListItem
 */
export interface ProductLineListItem {
  id: string
  name: string
  code?: string | null
  color?: string | null
  display_order: number
  is_active: boolean
}

/**
 * Product Line List Response (paginated)
 * Synced with: SalesProductLineListResponse
 */
export interface ProductLineListResponse {
  items: ProductLine[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ============================================================================
// QUOTATIONS
// ============================================================================

/**
 * Quotation (base interface)
 * Synced with: backend/modules/sales/quotations/schemas.py - QuotationBase
 */
export interface QuotationBase {
  quotation_number: string
  quotation_date: string
  client_id: string
  total_amount: number
  currency?: string
  validity_days?: number
  notes?: string | null
  external_system?: string | null
  external_id?: string | null
}

/**
 * Quotation Create Request
 * Synced with: QuotationCreate
 */
export interface QuotationCreate extends QuotationBase {
  status?: QuotationStatus
}

/**
 * Quotation Update Request
 * Synced with: QuotationUpdate
 */
export interface QuotationUpdate {
  quotation_number?: string
  quotation_date?: string
  client_id?: string
  total_amount?: number
  currency?: string
  validity_days?: number
  notes?: string | null
  external_system?: string | null
  external_id?: string | null
}

/**
 * Quotation Win Request
 * Synced with: QuotationWin
 */
export interface QuotationWinRequest {
  won_date: string
  sales_control_folio: string
  po_number: string
  po_reception_date: string
  lead_time_days?: number
  lines: SalesControlLineCreate[]
}

/**
 * Quotation Lose Request
 * Synced with: QuotationLose
 */
export interface QuotationLoseRequest {
  lost_date: string
  lost_reason: string
}

/**
 * Quotation Response
 * Synced with: QuotationResponse
 */
export interface Quotation extends QuotationBase {
  id: string
  tenant_id: string
  status: QuotationStatus
  won_date?: string | null
  lost_date?: string | null
  lost_reason?: string | null
  sales_control_id?: string | null
  client_name: string  // Denormalized
  created_at: string
  updated_at: string
}

/**
 * Quotation List Item
 * Synced with: QuotationListItem
 */
export interface QuotationListItem {
  id: string
  quotation_number: string
  quotation_date: string
  client_id: string
  client_name: string
  total_amount: number
  currency: string
  status: QuotationStatus
  created_at: string
}

/**
 * Quotation List Response (paginated)
 * Synced with: QuotationListResponse
 */
export interface QuotationListResponse {
  items: QuotationListItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Quotation Stats
 * Synced with: QuotationStats
 */
export interface QuotationStats {
  total_quotations: number
  won_quotations: number
  lost_quotations: number
  pending_quotations: number
  win_rate: number  // Percentage
  average_quotation_value: number
  total_quotation_value: number
  total_won_value: number
}

/**
 * Quotation Win Response
 * Synced with: QuotationWinResponse
 */
export interface QuotationWinResponse {
  quotation: Quotation
  sales_control: SalesControl
}

// ============================================================================
// SALES CONTROLS (Purchase Orders)
// ============================================================================

/**
 * Sales Control Line Create
 * Synced with: backend/modules/sales/controls/schemas.py - SalesControlLineCreate
 */
export interface SalesControlLineCreate {
  product_line_id: string
  line_amount: number
}

/**
 * Sales Control Line Response
 * Synced with: SalesControlLineResponse
 */
export interface SalesControlLine {
  id: string
  sales_control_id: string
  product_line_id: string
  product_line_name: string  // Denormalized
  line_amount: number
  percentage: number  // Calculated
}

/**
 * Sales Control (base interface)
 * Synced with: SalesControlBase
 */
export interface SalesControlBase {
  folio_number: string
  po_number: string
  po_reception_date: string
  promise_date?: string | null
  lead_time_days?: number | null
  client_id: string
  assigned_to: string
  quotation_id?: string | null
  total_amount: number
  currency?: string
  concept?: string | null
  notes?: string | null
}

/**
 * Sales Control Create Request
 * Synced with: SalesControlCreate
 */
export interface SalesControlCreate extends SalesControlBase {
  lines: SalesControlLineCreate[]
}

/**
 * Sales Control Update Request
 * Synced with: SalesControlUpdate
 */
export interface SalesControlUpdate {
  folio_number?: string
  po_number?: string
  po_reception_date?: string
  promise_date?: string | null
  lead_time_days?: number | null
  client_id?: string
  assigned_to?: string
  total_amount?: number
  currency?: string
  concept?: string | null
  notes?: string | null
}

/**
 * Sales Control Mark Delivered
 * Synced with: SalesControlMarkDelivered
 */
export interface SalesControlMarkDeliveredRequest {
  actual_delivery_date: string
}

/**
 * Sales Control Mark Invoiced
 * Synced with: SalesControlMarkInvoiced
 */
export interface SalesControlMarkInvoicedRequest {
  invoice_number: string
  invoice_date: string
}

/**
 * Sales Control Mark Paid
 * Synced with: SalesControlMarkPaid
 */
export interface SalesControlMarkPaidRequest {
  payment_date: string
}

/**
 * Sales Control Cancel
 * Synced with: SalesControlCancel
 */
export interface SalesControlCancelRequest {
  reason: string
}

/**
 * Sales Control Update Lead Time
 * Synced with: SalesControlUpdateLeadTime
 */
export interface SalesControlUpdateLeadTimeRequest {
  lead_time_days: number
}

/**
 * Sales Control Response
 * Synced with: SalesControlResponse
 */
export interface SalesControl extends SalesControlBase {
  id: string
  tenant_id: string
  status: SalesControlStatus
  actual_delivery_date?: string | null
  invoice_number?: string | null
  invoice_date?: string | null
  payment_date?: string | null
  cancellation_reason?: string | null
  client_name: string  // Denormalized
  sales_rep_name: string  // Denormalized
  product_line_name?: string | null  // Denormalized
  is_deleted: boolean
  created_at: string
  updated_at: string
}

/**
 * Sales Control Detail Response (with lines)
 * Synced with: SalesControlDetailResponse
 */
export interface SalesControlDetail extends SalesControl {
  lines: SalesControlLine[]
  is_overdue: boolean  // Calculated property
  days_until_promise?: number | null  // Calculated property
  days_in_production?: number | null  // Calculated property
  was_delivered_on_time?: boolean | null  // Calculated property
}

/**
 * Sales Control List Item
 * Synced with: SalesControlListItem
 */
export interface SalesControlListItem {
  id: string
  folio_number: string
  po_number: string
  po_reception_date: string
  promise_date?: string | null
  client_id: string
  client_name: string
  assigned_to: string
  sales_rep_name: string
  total_amount: number
  currency: string
  status: SalesControlStatus
  is_overdue: boolean
  days_until_promise?: number | null
  created_at: string
}

/**
 * Sales Control List Response (paginated)
 * Synced with: SalesControlListResponse
 */
export interface SalesControlListResponse {
  items: SalesControlListItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Sales Control Stats
 * Synced with: SalesControlStats
 */
export interface SalesControlStats {
  total_sales_controls: number
  by_status: {
    [key in SalesControlStatus]: {
      count: number
      total_amount: number
    }
  }
  overdue_count: number
  overdue_amount: number
  total_amount: number
  on_time_delivery_rate: number  // Percentage
  average_lead_time_days: number
}

// ============================================================================
// QUOTAS
// ============================================================================

/**
 * Quota Line Create
 * Synced with: backend/modules/sales/quotas/schemas.py - QuotaLineCreate
 */
export interface QuotaLineCreate {
  product_line_id: string
  quota_amount: number
}

/**
 * Quota Line Update
 * Synced with: QuotaLineUpdate
 */
export interface QuotaLineUpdate {
  quota_amount?: number
}

/**
 * Quota Line Response
 * Synced with: QuotaLineResponse
 */
export interface QuotaLine {
  id: string
  quota_id: string
  product_line_id: string
  product_line_name: string  // Denormalized
  quota_amount: number
  achieved_amount: number
  achievement_percentage: number  // Calculated
}

/**
 * Quota (base interface)
 * Synced with: QuotaBase
 */
export interface QuotaBase {
  user_id: string
  year: number
  month: number
}

/**
 * Quota Create Request
 * Synced with: QuotaCreate
 */
export interface QuotaCreate extends QuotaBase {
  lines: QuotaLineCreate[]
}

/**
 * Quota Update Request
 * Synced with: QuotaUpdate
 */
export interface QuotaUpdate {
  user_id?: string
  year?: number
  month?: number
}

/**
 * Quota Response
 * Synced with: QuotaResponse
 */
export interface Quota extends QuotaBase {
  id: string
  tenant_id: string
  total_quota: number
  total_achieved: number
  achievement_percentage: number  // Calculated
  is_deleted: boolean
  created_at: string
  updated_at: string
}

/**
 * Quota Detail Response (with lines)
 * Synced with: QuotaDetailResponse
 */
export interface QuotaDetail extends Quota {
  lines: QuotaLine[]
  user_name: string  // Denormalized
}

/**
 * Quota List Item
 * Synced with: QuotaListItem
 */
export interface QuotaListItem {
  id: string
  user_id: string
  user_name: string
  year: number
  month: number
  total_quota: number
  total_achieved: number
  achievement_percentage: number
  created_at: string
}

/**
 * Quota List Response (paginated)
 * Synced with: QuotaListResponse
 */
export interface QuotaListResponse {
  items: QuotaListItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Quota Dashboard Stats
 * Synced with: QuotaDashboardStats
 */
export interface QuotaDashboardStats extends QuotaDetail {
  // Inherits all fields from QuotaDetail
}

/**
 * Monthly Quota Trend
 * Synced with: MonthlyQuotaTrend
 */
export interface MonthlyQuotaTrend {
  year: number
  month: number
  quota_amount: number
  achieved_amount: number
  achievement_percentage: number
}

/**
 * Quota Trends Response
 * Synced with: QuotaTrendsResponse
 */
export interface QuotaTrendsResponse {
  user_id: string
  user_name: string
  year: number
  trends: MonthlyQuotaTrend[]
}

/**
 * Annual Quota Stats
 * Synced with: AnnualQuotaStats
 */
export interface AnnualQuotaStats {
  user_id: string
  user_name: string
  year: number
  total_quota: number
  total_achieved: number
  achievement_percentage: number
  by_product_line: {
    product_line_id: string
    product_line_name: string
    quota_amount: number
    achieved_amount: number
    achievement_percentage: number
  }[]
}

/**
 * Quota Comparison Item
 * Synced with: QuotaComparisonItem
 */
export interface QuotaComparisonItem {
  year: number
  month: number
  quota_amount: number
  achieved_amount: number
  achievement_percentage: number
}

/**
 * Quota Comparison Response
 * Synced with: QuotaComparisonResponse
 */
export interface QuotaComparisonResponse {
  user_id: string
  user_name: string
  current_month: QuotaComparisonItem
  previous_month: QuotaComparisonItem
  change_percentage: number
}

// ============================================================================
// SALES GENERAL
// ============================================================================

/**
 * Sales Dashboard Stats
 */
export interface SalesDashboardStats {
  total_quotations: number
  active_sales_controls: number
  total_revenue: number
  win_rate: number
}

/**
 * Sales Funnel Stats
 */
export interface SalesFunnelStats {
  leads: number
  quotations: number
  won_quotations: number
  active_orders: number
  paid_orders: number
}

/**
 * Sales Performance by Rep
 */
export interface SalesPerformanceByRep {
  user_id: string
  user_name: string
  quotations_count: number
  won_count: number
  win_rate: number
  total_sales: number
  quota_achievement: number
}

/**
 * Sales by Product Line
 */
export interface SalesByProductLine {
  product_line_id: string
  product_line_name: string
  total_sales: number
  order_count: number
  percentage_of_total: number
}

// ============================================================================
// FILTER INTERFACES
// ============================================================================

/**
 * Quotations Filter
 */
export interface QuotationFilters {
  client_id?: string
  status?: QuotationStatus
  date_from?: string
  date_to?: string
  min_amount?: number
  max_amount?: number
  search?: string
  page?: number
  page_size?: number
}

/**
 * Sales Controls Filter
 */
export interface SalesControlFilters {
  client_id?: string
  assigned_to?: string
  quotation_id?: string
  status?: SalesControlStatus
  po_date_from?: string
  po_date_to?: string
  promise_date_from?: string
  promise_date_to?: string
  min_amount?: number
  max_amount?: number
  is_overdue?: boolean
  search?: string
  page?: number
  page_size?: number
}

/**
 * Quotas Filter
 */
export interface QuotaFilters {
  user_id?: string
  year?: number
  month?: number
  page?: number
  page_size?: number
}

/**
 * Product Lines Filter
 */
export interface ProductLineFilters {
  is_active?: boolean
  page?: number
  page_size?: number
}
