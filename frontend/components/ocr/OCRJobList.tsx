/**
 * OCRJobList Component
 * List and manage OCR jobs with filtering and pagination
 */

'use client'

import { useEffect, useState } from 'react'
import { useOCR } from '@/hooks/useOCR'
import { OCRJob, OCRJobStatus } from '@/types/ocr'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { OCRJobStatusBadge } from './OCRJobStatus'
import { Eye, Trash2, RefreshCw, FileImage } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function OCRJobList() {
  const { jobs, isLoading, pagination, fetchJobs, deleteJob, retryJob } = useOCR()
  const [statusFilter, setStatusFilter] = useState<OCRJobStatus | 'ALL'>('ALL')

  useEffect(() => {
    fetchJobs({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      page: 1,
      page_size: 10,
    })
  }, [statusFilter, fetchJobs])

  const handleDelete = async (jobId: string) => {
    await deleteJob(jobId)
  }

  const handleRetry = async (jobId: string) => {
    await retryJob(jobId)
  }

  const handlePageChange = (newPage: number) => {
    fetchJobs({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      page: newPage,
      page_size: 10,
    })
  }

  if (isLoading && jobs.length === 0) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">OCR Jobs</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter by status:</span>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as OCRJobStatus | 'ALL')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value={OCRJobStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={OCRJobStatus.PROCESSING}>Processing</SelectItem>
                <SelectItem value={OCRJobStatus.COMPLETED}>Completed</SelectItem>
                <SelectItem value={OCRJobStatus.FAILED}>Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <FileImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No OCR jobs found</h3>
            <p className="text-sm text-gray-500">
              Upload a receipt to get started with OCR processing
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                          <FileImage className="h-6 w-6 text-gray-400" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <OCRJobStatusBadge status={job.status} />
                      </TableCell>
                      <TableCell>
                        {job.extracted_data?.provider || (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {job.extracted_data?.amount ? (
                          <span>
                            {job.extracted_data.currency}{' '}
                            {job.extracted_data.amount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {job.extracted_data?.date ? (
                          format(new Date(job.extracted_data.date), 'MMM dd, yyyy')
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {job.confidence !== undefined ? (
                          <span
                            className={
                              job.confidence >= 0.8
                                ? 'text-green-600 font-medium'
                                : job.confidence >= 0.6
                                ? 'text-yellow-600 font-medium'
                                : 'text-red-600 font-medium'
                            }
                          >
                            {(job.confidence * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(new Date(job.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {job.status === OCRJobStatus.COMPLETED && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/ocr/${job.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}

                          {job.status === OCRJobStatus.FAILED && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRetry(job.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete OCR Job</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this OCR job? This
                                  action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(job.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total}{' '}
                  total jobs)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
