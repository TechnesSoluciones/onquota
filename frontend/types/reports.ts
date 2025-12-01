/**
 * Reports TypeScript Types
 * Synced with backend/modules/reports/schemas.py
 */

// ============================================================================
// Base Types
// ============================================================================

export interface DatePeriod {
  start_date: string
  end_date: string
  label?: string
}

export interface ComparisonMetrics {
  previous_value: number
  current_value: number
  change_amount: number
  change_percentage: number
  trend: 'up' | 'down' | 'neutral'
}

export interface TrendPoint {
  date: string
  value: number
  label?: string
}

// ============================================================================
// Filters
// ============================================================================

export interface ReportFilters {
  start_date?: string
  end_date?: string
  client_id?: string
  sales_rep_id?: string
  product_line_id?: string
  currency?: string
  comparison_period?: 'previous_period' | 'previous_year'
}

// ============================================================================
// Dashboard Executive
// ============================================================================

export interface DashboardKPIs {
  // Revenue metrics
  total_revenue: number
  revenue_growth: number

  // Quotations metrics
  active_quotations: number
  quotations_value: number
  win_rate: number

  // Pipeline metrics
  pipeline_value: number
  weighted_pipeline: number

  // Activity metrics
  visits_this_period: number
  new_clients: number

  // Efficiency metrics
  avg_sales_cycle_days: number
  conversion_rate: number

  // Expenses metrics
  total_expenses: number
  expense_to_revenue_ratio: number
}

export interface SalesRepPerformance {
  user_id: string
  user_name: string
  total_revenue: number
  quotations_count: number
  won_count: number
  win_rate: number
  quota_achievement?: number
}

export interface ProductLineMetric {
  product_line_id: string
  product_line_name: string
  total_sales: number
  order_count: number
  percentage_of_total: number
}

export interface ClientRevenueMetric {
  client_id: string
  client_name: string
  total_revenue: number
  total_transactions: number
  avg_transaction_value: number
  percentage_of_total: number
}

export interface DashboardAlert {
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  metric_value?: string
  threshold?: string
  created_at: string
}

export interface ExecutiveDashboard {
  period: DatePeriod
  kpis: DashboardKPIs
  revenue_trend: TrendPoint[]
  quotations_trend: TrendPoint[]
  visits_trend: TrendPoint[]
  top_sales_reps: SalesRepPerformance[]
  top_clients: ClientRevenueMetric[]
  top_product_lines: ProductLineMetric[]
  alerts: DashboardAlert[]
  generated_at: string
  cache_key?: string
}

// ============================================================================
// Quotation Reports
// ============================================================================

export interface MonthlyConversionMetrics {
  year: number
  month: number
  month_name: string
  total_quotations: number
  won_quotations: number
  lost_quotations: number
  win_rate: number
  total_amount: number
  won_amount: number
}

export interface QuotationConversionReport {
  period: DatePeriod
  total_quotations: number
  total_quoted_amount: number
  won_quotations: number
  won_amount: number
  won_percentage: number
  lost_quotations: number
  lost_amount: number
  lost_percentage: number
  pending_quotations: number
  pending_amount: number
  quotations_with_sales_control: number
  sales_controls_amount: number
  conversion_rate: number
  avg_time_to_close_days?: number
  comparison?: ComparisonMetrics
  by_month: MonthlyConversionMetrics[]
}

// ============================================================================
// Sales Funnel
// ============================================================================

export interface SalesFunnelReport {
  period: DatePeriod
  total_visits: number
  unique_clients_visited: number
  quotations_from_visits: number
  quotations_amount: number
  visit_to_quotation_rate: number
  won_quotations: number
  won_amount: number
  quotation_to_win_rate: number
  sales_controls_created: number
  sales_controls_amount: number
  paid_sales_controls: number
  paid_amount: number
  win_to_paid_rate: number
  overall_conversion_rate: number
  avg_deal_size: number
  avg_sales_cycle_days: number
  avg_visit_to_quotation_days: number
  avg_quotation_to_win_days: number
  avg_win_to_paid_days: number
}

// ============================================================================
// Export
// ============================================================================

export interface ExportRequest {
  report_type:
    | 'executive_dashboard'
    | 'quotation_conversion'
    | 'sales_funnel'
    | 'top_clients'
    | 'visits_effectiveness'
  format: 'excel' | 'pdf'
  filters: ReportFilters
  include_charts?: boolean
}

export interface ExportJob {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  report_type: string
  format: string
  created_at: string
  completed_at?: string
  download_url?: string
  error_message?: string
}
