/**
 * OCR Service Types
 * Type definitions for OCR processing and receipt extraction
 */

export enum OCRJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ExtractedData {
  provider: string
  amount: number
  currency: string
  date: string
  category: string
  items?: Array<{
    description: string
    quantity: number
    unit_price: number
  }>
}

export interface OCRJob {
  id: string
  tenant_id: string
  user_id: string
  image_path: string
  status: OCRJobStatus
  confidence?: number
  extracted_data?: ExtractedData
  error_message?: string
  created_at: string
  updated_at: string
}

export interface OCRJobCreateResponse {
  id: string
  status: OCRJobStatus
  message: string
}

export interface OCRJobListParams {
  status?: OCRJobStatus
  page?: number
  page_size?: number
}

export interface OCRJobListResponse {
  jobs: OCRJob[]
  total: number
  page: number
  total_pages: number
}
