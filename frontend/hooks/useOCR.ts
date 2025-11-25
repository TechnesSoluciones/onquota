/**
 * useOCR Hook
 * Custom hook for OCR processing and receipt extraction
 */

import { useState, useCallback, useEffect } from 'react'
import { ocrApi } from '@/lib/api/ocr'
import { OCRJob, OCRJobStatus, ExtractedData, OCRJobListParams } from '@/types/ocr'
import { useToast } from '@/hooks/use-toast'

export function useOCR() {
  const [jobs, setJobs] = useState<OCRJob[]>([])
  const [currentJob, setCurrentJob] = useState<OCRJob | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 0,
  })
  const { toast } = useToast()

  /**
   * Upload receipt for OCR processing
   */
  const uploadReceipt = useCallback(
    async (file: File) => {
      try {
        setIsLoading(true)
        const response = await ocrApi.uploadReceipt(file)

        toast({
          title: 'Receipt uploaded',
          description: 'Processing will start shortly...',
        })

        // Start polling for status
        pollJobStatus(response.id)

        return response.id
      } catch (error: any) {
        toast({
          title: 'Upload failed',
          description: error.detail || 'Failed to upload receipt',
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
      const maxAttempts = 60 // 5 minutes (5s intervals)
      let attempts = 0

      const interval = setInterval(async () => {
        try {
          const job = await ocrApi.getJob(jobId)
          setCurrentJob(job)

          if (job.status === OCRJobStatus.COMPLETED) {
            clearInterval(interval)
            toast({
              title: 'Processing complete!',
              description: `Confidence: ${((job.confidence || 0) * 100).toFixed(0)}%`,
            })
          } else if (job.status === OCRJobStatus.FAILED) {
            clearInterval(interval)
            toast({
              title: 'Processing failed',
              description: job.error_message || 'Unknown error',
              variant: 'destructive',
            })
          }

          attempts++
          if (attempts >= maxAttempts) {
            clearInterval(interval)
            toast({
              title: 'Processing timeout',
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
   * Confirm and edit extracted data
   */
  const confirmExtraction = useCallback(
    async (jobId: string, data: ExtractedData) => {
      try {
        setIsLoading(true)
        const updatedJob = await ocrApi.confirmExtraction(jobId, data)
        setCurrentJob(updatedJob)

        toast({
          title: 'Data confirmed',
          description: 'You can now create an expense from this data',
        })

        return updatedJob
      } catch (error: any) {
        toast({
          title: 'Confirmation failed',
          description: error.detail || 'Failed to confirm data',
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
   * Fetch list of OCR jobs
   */
  const fetchJobs = useCallback(
    async (params: OCRJobListParams = {}) => {
      try {
        setIsLoading(true)
        const response = await ocrApi.listJobs(params)
        setJobs(response.jobs)
        setPagination({
          total: response.total,
          page: response.page,
          totalPages: response.total_pages,
        })
      } catch (error: any) {
        toast({
          title: 'Failed to load jobs',
          description: error.detail || 'Could not fetch OCR jobs',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  /**
   * Delete OCR job
   */
  const deleteJob = useCallback(
    async (jobId: string) => {
      try {
        setIsLoading(true)
        await ocrApi.deleteJob(jobId)

        toast({
          title: 'Job deleted',
          description: 'OCR job has been deleted successfully',
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
   * Retry failed job
   */
  const retryJob = useCallback(
    async (jobId: string) => {
      try {
        setIsLoading(true)
        const job = await ocrApi.retryJob(jobId)
        setCurrentJob(job)

        toast({
          title: 'Job restarted',
          description: 'Processing will start shortly...',
        })

        // Start polling
        pollJobStatus(jobId)
      } catch (error: any) {
        toast({
          title: 'Retry failed',
          description: error.detail || 'Failed to retry job',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast, pollJobStatus]
  )

  /**
   * Fetch single job
   */
  const fetchJob = useCallback(
    async (jobId: string) => {
      try {
        setIsLoading(true)
        const job = await ocrApi.getJob(jobId)
        setCurrentJob(job)
        return job
      } catch (error: any) {
        toast({
          title: 'Failed to load job',
          description: error.detail || 'Could not fetch OCR job',
          variant: 'destructive',
        })
        throw error
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
    uploadReceipt,
    pollJobStatus,
    confirmExtraction,
    fetchJobs,
    fetchJob,
    deleteJob,
    retryJob,
  }
}
