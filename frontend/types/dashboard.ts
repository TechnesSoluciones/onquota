/**
 * Dashboard Type Definitions
 * Synchronized with backend Pydantic schemas
 */

export interface KPIMetric {
  title: string
  current_value: number
  previous_value: number | null
  change_percent: number | null
  is_positive: boolean
  format_type: 'currency' | 'number' | 'percentage'
}

export interface DashboardKPIs {
  total_revenue: KPIMetric
  monthly_quota: KPIMetric
  conversion_rate: KPIMetric
  active_clients: KPIMetric
  new_clients_this_month: KPIMetric
  total_expenses: KPIMetric
  pending_approvals: KPIMetric
  quotes_sent: KPIMetric
  quotes_accepted: KPIMetric
}

export interface MonthlyDataPoint {
  month: string // YYYY-MM format
  value: number
  label: string // Display label (e.g., "Ene 2025")
}

export interface RevenueData {
  current_year: MonthlyDataPoint[]
  previous_year: MonthlyDataPoint[] | null
  total_current_year: number
  total_previous_year: number | null
}

export interface ExpensesData {
  current_year: MonthlyDataPoint[]
  previous_year: MonthlyDataPoint[] | null
  total_current_year: number
  total_previous_year: number | null
  by_category: Array<Record<string, number>>
}

export interface TopClient {
  client_id: string
  client_name: string
  total_revenue: number
  quote_count: number
  last_quote_date: string | null
}

export interface TopClientsData {
  clients: TopClient[]
  period: 'current_month' | 'current_year' | 'all_time'
}

export interface ActivityEvent {
  id: string
  type: 'quote_created' | 'quote_accepted' | 'expense_approved' | 'client_created'
  title: string
  description: string
  user_name: string | null
  timestamp: string // ISO format
  metadata: Record<string, any> | null
}

export interface RecentActivityData {
  events: ActivityEvent[]
  total_events: number
}

export interface DashboardSummary {
  // Year-to-date metrics
  total_revenue_ytd: number
  total_expenses_ytd: number
  net_profit_ytd: number
  profit_margin: number

  // Counts
  total_clients: number
  total_quotes: number
  total_expenses_count: number

  // Month-over-month changes
  revenue_mom_change: number
  expenses_mom_change: number

  // Current month totals
  current_month_revenue: number
  current_month_expenses: number
  current_month_quotes: number
}
