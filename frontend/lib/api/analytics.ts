/**
 * Analytics API Client
 * API client for SPA (Sales Performance Analysis)
 */

import { apiClient } from './client'
import type {
  AnalysisJob,
  AnalysisJobCreateResponse,
  AnalysisJobListParams,
  AnalysisJobListResponse,
} from '@/types/analytics'

export const analyticsApi = {
  /**
   * Upload sales file for analysis
   */
  async uploadFile(file: File): Promise<AnalysisJobCreateResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await apiClient.post<AnalysisJobCreateResponse>(
      '/api/v1/analytics/process',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    return data
  },

  /**
   * Get analysis job status and results
   */
  async getJob(jobId: string): Promise<AnalysisJob> {
    const { data } = await apiClient.get<AnalysisJob>(
      `/api/v1/analytics/jobs/${jobId}`
    )
    return data
  },

  /**
   * List analysis jobs with pagination and filtering
   */
  async listJobs(params: AnalysisJobListParams = {}): Promise<AnalysisJobListResponse> {
    const { data } = await apiClient.get<AnalysisJobListResponse>(
      '/api/v1/analytics/jobs',
      { params }
    )
    return data
  },

  /**
   * Delete analysis job
   */
  async deleteJob(jobId: string): Promise<void> {
    await apiClient.delete(`/api/v1/analytics/jobs/${jobId}`)
  },

  /**
   * Export analysis results as Excel
   */
  async exportExcel(jobId: string): Promise<Blob> {
    const { data } = await apiClient.get(`/api/v1/analytics/jobs/${jobId}/export`, {
      responseType: 'blob',
      params: { format: 'excel' },
    })
    return data
  },

  /**
   * Export analysis results as PDF
   */
  async exportPDF(jobId: string): Promise<Blob> {
    const { data } = await apiClient.get(`/api/v1/analytics/jobs/${jobId}/export`, {
      responseType: 'blob',
      params: { format: 'pdf' },
    })
    return data
  },
}
