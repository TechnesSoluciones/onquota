/**
 * SPA Analytics Types
 * Type definitions for sales performance analysis
 */

export enum AnalysisStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ABCClassification {
  category: 'A' | 'B' | 'C'
  product_count: number
  sales_percentage: number
  description: string
}

export interface TopProduct {
  product_code: string
  product_name: string
  category: 'A' | 'B' | 'C'
  total_sales: number
  total_quantity: number
  avg_discount: number
  margin_percentage: number
}

export interface DiscountAnalysis {
  avg_discount_percentage: number
  total_discounted_sales: number
  discount_frequency: number
  highest_discount: number
  products_with_discount: number
}

export interface MonthlyTrend {
  month: string
  total_sales: number
  total_quantity: number
  avg_ticket: number
  unique_products: number
}

export interface AnalysisResults {
  abc_classification: ABCClassification[]
  top_products: TopProduct[]
  discount_analysis: DiscountAnalysis
  monthly_trends: MonthlyTrend[]
  summary: {
    total_sales: number
    total_quantity: number
    unique_products: number
    avg_ticket: number
    date_range: {
      start: string
      end: string
    }
  }
}

export interface AnalysisJob {
  id: string
  tenant_id: string
  user_id: string
  file_path: string
  file_name: string
  status: AnalysisStatus
  results?: AnalysisResults
  error_message?: string
  created_at: string
  updated_at: string
  processed_at?: string
}

export interface AnalysisJobCreateResponse {
  id: string
  status: AnalysisStatus
  message: string
}

export interface AnalysisJobListParams {
  status?: AnalysisStatus
  page?: number
  page_size?: number
}

export interface AnalysisJobListResponse {
  jobs: AnalysisJob[]
  total: number
  page: number
  total_pages: number
}
