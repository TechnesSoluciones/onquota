/**
 * useAnalytics Hook
 * Custom hook for SPA (Sales Performance Analysis)
 */

import { useState, useCallback } from 'react'
import { analyticsApi } from '@/lib/api/analytics'
import {
  AnalysisJob,
  AnalysisStatus,
  AnalysisJobListParams,
} from '@/types/analytics'
import { useToast } from '@/hooks/use-toast'

export function useAnalytics() {
  const [jobs, setJobs] = useState<AnalysisJob[]>([])
  const [currentJob, setCurrentJob] = useState<AnalysisJob | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 0,
  })
  const { toast } = useToast()

  /**
   * Upload file for analysis
   */
  const uploadFile = useCallback(
    async (file: File) => {
      try {
        setIsLoading(true)
        const response = await analyticsApi.uploadFile(file)

        toast({
          title: 'File uploaded',
          description: 'Analysis will start shortly...',
        })

        // Start polling for status
        pollJobStatus(response.id)

        return response.id
      } catch (error: any) {
        toast({
          title: 'Upload failed',
          description: error.detail || 'Failed to upload file',
          variant: 'destructive',
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  /**
   * Poll job status until completion or failure
   */
  const pollJobStatus = useCallback(
    async (jobId: string) => {
      const maxAttempts = 120 // 10 minutes (5s intervals)
      let attempts = 0

      const interval = setInterval(async () => {
        try {
          const job = await analyticsApi.getJob(jobId)
          setCurrentJob(job)

          if (job.status === AnalysisStatus.COMPLETED) {
            clearInterval(interval)
            toast({
              title: 'Analysis complete!',
              description: 'View your results now',
            })
          } else if (job.status === AnalysisStatus.FAILED) {
            clearInterval(interval)
            toast({
              title: 'Analysis failed',
              description: job.error_message || 'Unknown error',
              variant: 'destructive',
            })
          }

          attempts++
          if (attempts >= maxAttempts) {
            clearInterval(interval)
            toast({
              title: 'Analysis timeout',
              description: 'Please check the job status manually',
              variant: 'destructive',
            })
          }
        } catch (error) {
          clearInterval(interval)
          console.error('Polling error:', error)
        }
      }, 5000) // Poll every 5 seconds
    },
    [toast]
  )

  /**
   * Fetch list of analysis jobs
   */
  const fetchJobs = useCallback(
    async (params: AnalysisJobListParams = {}) => {
      try {
        setIsLoading(true)
        const response = await analyticsApi.listJobs(params)
        setJobs(response.jobs)
        setPagination({
          total: response.total,
          page: response.page,
          totalPages: response.total_pages,
        })
      } catch (error: any) {
        toast({
          title: 'Failed to load jobs',
          description: error.detail || 'Could not fetch analysis jobs',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  /**
   * Fetch single job
   */
  const fetchJob = useCallback(
    async (jobId: string) => {
      try {
        setIsLoading(true)
        const job = await analyticsApi.getJob(jobId)
        setCurrentJob(job)
        return job
      } catch (error: any) {
        toast({
          title: 'Failed to load job',
          description: error.detail || 'Could not fetch analysis job',
          variant: 'destructive',
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  /**
   * Delete analysis job
   */
  const deleteJob = useCallback(
    async (jobId: string) => {
      try {
        setIsLoading(true)
        await analyticsApi.deleteJob(jobId)

        toast({
          title: 'Job deleted',
          description: 'Analysis job has been deleted successfully',
        })

        // Refresh jobs list
        fetchJobs({ page: pagination.page })
      } catch (error: any) {
        toast({
          title: 'Delete failed',
          description: error.detail || 'Failed to delete job',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, pagination.page, fetchJobs]
  )

  /**
   * Export results as Excel
   */
  const exportExcel = useCallback(
    async (jobId: string, fileName: string) => {
      try {
        setIsLoading(true)
        const blob = await analyticsApi.exportExcel(jobId)

        // Create download link
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${fileName}_analysis.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast({
          title: 'Export successful',
          description: 'Excel file downloaded',
        })
      } catch (error: any) {
        toast({
          title: 'Export failed',
          description: error.detail || 'Failed to export results',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  /**
   * Export results as PDF
   */
  const exportPDF = useCallback(
    async (jobId: string, fileName: string) => {
      try {
        setIsLoading(true)
        const blob = await analyticsApi.exportPDF(jobId)

        // Create download link
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${fileName}_analysis.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast({
          title: 'Export successful',
          description: 'PDF file downloaded',
        })
      } catch (error: any) {
        toast({
          title: 'Export failed',
          description: error.detail || 'Failed to export results',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  return {
    jobs,
    currentJob,
    isLoading,
    pagination,
    uploadFile,
    pollJobStatus,
    fetchJobs,
    fetchJob,
    deleteJob,
    exportExcel,
    exportPDF,
  }
}
