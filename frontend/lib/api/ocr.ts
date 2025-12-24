/**
 * OCR API Client
 * API client for OCR processing and receipt extraction
 */

import { apiClient } from './client'
import type {
  OCRJob,
  OCRJobCreateResponse,
  OCRJobListParams,
  OCRJobListResponse,
  ExtractedData,
} from '@/types/ocr'

export const ocrApi = {
  /**
   * Upload receipt image for OCR processing
   */
  async uploadReceipt(file: File): Promise<OCRJobCreateResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await apiClient.post<OCRJobCreateResponse>(
      '/api/v1/ocr/process',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    return data
  },

  /**
   * Get OCR job status and results
   */
  async getJob(jobId: string): Promise<OCRJob> {
    const { data } = await apiClient.get<OCRJob>(`/api/v1/ocr/jobs/${jobId}`)
    return data
  },

  /**
   * List OCR jobs with pagination and filtering
   */
  async listJobs(params: OCRJobListParams = {}): Promise<OCRJobListResponse> {
    const { data } = await apiClient.get<OCRJobListResponse>('/api/v1/ocr/jobs', {
      params,
    })
    return data
  },

  /**
   * Confirm and edit extracted data
   */
  async confirmExtraction(
    jobId: string,
    confirmedData: ExtractedData
  ): Promise<OCRJob> {
    const { data } = await apiClient.put<OCRJob>(
      `/api/v1/ocr/jobs/${jobId}/confirm`,
      confirmedData
    )
    return data
  },

  /**
   * Delete OCR job
   */
  async deleteJob(jobId: string): Promise<void> {
    await apiClient.delete(`/api/v1/ocr/jobs/${jobId}`)
  },

  /**
   * Retry failed OCR job
   */
  async retryJob(jobId: string): Promise<OCRJob> {
    const { data } = await apiClient.post<OCRJob>(`/api/v1/ocr/jobs/${jobId}/retry`)
    return data
  },
}
